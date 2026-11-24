# TELEAGENT MASTER IMPLEMENTATION PROMPT

Date: 24/11/2026

## Overview

TeleAgent is an AI Voice Platform for Tejo EV (electric two-wheeler company) that handles both **inbound** and **outbound** voice calls using Google's Gemini Live API for real-time conversational AI. The platform supports Kannada, English, and other South Indian languages.

## Architecture

### Backend (Node.js/Express + MongoDB)

**Entry Point**: `backend/server.js` - HTTP + WebSocket server on port 5000

#### WebSocket Endpoints
- `/media-stream` — Browser audio (testing/demo)
- `/exotel-stream` — Exotel telephony integration

#### Core Modules

| Module | File | Purpose |
|--------|------|---------|
| Voice Agent Orchestrator | `backend/agent/voiceAgent.js` | Connects Gemini Live with call manager, handles conversation lifecycle |
| Gemini Live Session | `backend/services/gemini/geminiLive.js` | Real-time audio/text streaming with Google GenAI |
| Gemini Prompts | `backend/services/gemini/geminiPrompts.js` | System instructions, greetings, no-response reminders |
| Tejo EV Knowledge | `backend/services/tevoEv/knowledge.js` | Product, price, showroom, service data for Tejo EV |
| Call Management | `backend/services/callService.js` | CRUD for Call records |
| Customer Management | `backend/services/customerService.js` | Customer CRUD, name/phone validation |
| Call Analysis | `backend/services/callAnalysis.js` | Post-call AI analysis (summary, interest, follow-up) |
| Call Finalizer | `backend/services/call/callFinalizer.js` | Finalizes calls, persists analysis, updates customer profiles |
| Customer Context | `backend/services/customer/customerContext.js` | Phone-based customer lookup |
| Callback Scheduler | `backend/services/callbackScheduler.js` | Periodic check for due callbacks |
| Callback Service | `backend/services/callbackService.js` | Find due callbacks, mark processing/completed |
| Exotel Transport | `backend/transports/exotel/exotelStream.js` | Exotel WebSocket protocol, audio resampling, speech detection |
| Exotel Client | `backend/transports/exotel/exotelClient.js` | Low-level Exotel WebSocket ops |
| Exotel Audio | `backend/transports/exotel/exotelAudio.js` | Audio conversion, buffering, playback, interruptions |
| Exotel Call Manager | `backend/transports/exotel/exotelCall.js` | Call context, Voice Agent lifecycle, finalization |
| Exotel Call Service | `backend/transports/exotel/exotelCallService.js` | Outbound call initiation via Exotel API |
| Browser Transport | `backend/transports/browser.js` | Browser WebSocket connection handling |
| Database | `backend/database/connection.js` | MongoDB connection |

#### Models
- `backend/models/Call.js` — Call records (inbound/outbound, status, outcome, follow-up)
- `backend/models/Customer.js` — Customer CRM (name, phone, summary, interest, doNotCall)
- `backend/models/BulkCall.js` — Bulk dial campaigns

#### Routes
- `backend/routes/callRoutes.js` — Call API (`/api/call`)
- `backend/routes/customerRoutes.js` — Customer API (`/api/customers`)
- `backend/routes/exotelRoutes.js` — Exotel stream URL (`/api/exotel`)

#### Controllers
- `backend/controllers/callController.js` — Call initiation, bulk campaigns, follow-ups
- `backend/controllers/customerController.js` — Customer listing, details


## Working Flow

### 1. Inbound Call Flow (Exotel)

1. Customer calls Tejo EV Exotel number
2. Exotel Flow Applet opens WebSocket to `wss://.../exotel-stream`
3. `handleExotelConnection()` is called
4. Call context is hydrated: phone → customer lookup → existing Call record or new one
5. Voice Agent is created via `createVoiceAgent()` → Gemini Live session
6. Customer audio (PCM16, 16kHz) → resampled to 24kHz for Gemini → Gemini processes → audio back to Exotel
7. Transcripts are collected in memory during the call
8. When call ends (Exotel `stop` event or WebSocket close):
   - `finalizeCurrentCall()` → `finalizeCall()`
   - Conversation analyzed by Gemini (`analyzeCall()`)
   - Call record updated with summary, interest status, outcome, follow-up
   - Customer profile updated (`updateCustomerAfterCall()`)

### 2. Outbound Call Flow (Browser/API)

1. Frontend POSTs to `/api/call` with phone number
2. `initiateCall()` controller:
   - Validates phone number
   - Looks up customer context by phone
   - Checks Do-Not-Call flag
   - Creates Call record (status: "created")
   - Calls `initiateExotelFlowCall()` → Exotel API `Calls/connect`
   - Updates Call record with Exotel SID (status: "initiated")
3. Exotel Flow connects → WebSocket to `/exotel-stream` → same as inbound flow

### 3. Browser/WebSocket Test Flow

1. Browser connects to `ws://localhost:5000/media-stream?customerId=...`
2. `handleBrowserConnection()` is called
3. Customer looked up or created
4. Voice Agent created with initial greeting
5. Customer sends audio/text via WebSocket messages
6. Gemini processes and responds with audio + transcripts
7. On disconnect: call analyzed and saved

### 4. Call Analysis & Finalization

1. Conversation transcripts collected in memory
2. On call end, `analyzeCall()` sends conversation to Gemini
3. Gemini returns JSON with: customerName, summary, language, interestStatus, callOutcome, followUpRequired, callbackDate, callbackTime, callbackReason, nextAction
4. Call record updated with analysis results
5. Customer profile updated with rolling summary and conversation rate
6. If follow-up required: `callbackStatus` set to "pending", `followUpAt` scheduled

### 5. Callback Scheduler

1. `startCallbackScheduler()` runs on server start
2. Every 60 seconds, `checkCallbacks()` finds due callbacks (`followUpAt <= now`)
3. Filters out Do-Not-Call customers
4. Marks callbacks as "processing"
5. (Manual agent callback or automated outbound call can be triggered)

### 6. Bulk Dial Campaign

1. Frontend POSTs phone numbers to `/api/call/bulk`
2. Numbers normalized and validated
3. BulkCall record created with status "created"
4. `startBulkCallInBackground()` processes sequentially:
   - For each number: customer lookup → create Call → Exotel call → wait for completion
   - Gap between calls (configurable)
   - Pause/resume/cancel support via in-memory processor map

## Key Features

- **Real-time Voice**: Gemini Live API for sub-second audio response
- **Interruption Handling**: Customer speech detection interrupts AI audio
- **Multi-language**: Bangalore Kannada + English default, follows customer's language
- **Customer Memory**: Rolling conversation summaries persisted per customer
- **Follow-up Scheduling**: Callback requests tracked with scheduled times
- **Do-Not-Call**: Customers marked not_interested are blocked from future calls
- **Bulk Dialing**: Sequential outbound campaigns with retry logic

## Environment Variables (.env)

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://...
EXOTEL_API_KEY=your_exotel_api_key
EXOTEL_API_TOKEN=your_exotel_api_token
EXOTEL_ACCOUNT_SID=your_exotel_account_sid
EXOTEL_CALLER_ID=your_exotel_caller_id
EXOTEL_STREAM_URL=wss://your-domain/exotel-stream
EXOTEL_API_BASE_URL=https://api.exotel.com
EXOTEL_FLOW_APP_ID=your_flow_app_id
```

## Known Issues & Fixes Applied

1. **Missing `extractCustomerName` function** — Added heuristic name extraction to `browser.js`
2. **Customer ID unique constraint violation** — Fixed to generate new `CUS_${uuid}` when provided customerId not found
3. **Invalid Gemini model names** — Updated `gemini-3.1-flash-live-preview` → `gemini-2.0-flash-live-001` and `gemini-3.5-flash-lite` → `gemini-2.5-flash-preview-04-17`
4. **Follow-up time calculation** — Fixed to use `callbackDate`/`callbackTime` from analysis instead of non-existent `followUpDelayMinutes`
5. **Customer ID in close handler** — Fixed to use resolved customer ID instead of original URL param
6. **Hardcoded greeting** — Changed "Good morning, Prajwal" to "Good morning" in DashboardPage.jsx