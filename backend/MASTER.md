# MASTER_BACKEND.md

# TEJO EV AI VOICE CRM — BACKEND REFERENCE

This file is the backend reference for the Tejo EV AI Voice CRM.

Use this document as the first reference when making backend changes.

When a change is requested:

1. Read this file.
2. Identify the responsible module/file.
3. Ask for the current version of that file and any directly related files needed for the change.
4. Review the actual current code before modifying it.
5. Preserve the existing architecture unless a change requires otherwise.

This document describes the current backend architecture, responsibilities, important functions, data flow, and business behavior.

---

# 1. BACKEND GOAL

The backend powers an outbound AI phone-calling system.

```text
Frontend
   ↓
Node.js / Express
   ↓
Call Controller
   ↓
Customer Context
   ↓
Call Service
   ↓
Exotel Call Service
   ↓
Customer Phone
   ↕
Exotel WebSocket
   ↕
Exotel Stream
   ↕
Voice Agent
   ↕
Gemini Live
   ↓
MongoDB
```

The backend is responsible for:

- starting outbound calls
- finding existing customers
- creating Call records
- connecting Exotel to the Voice Agent
- connecting the Voice Agent to Gemini Live
- sending customer audio to Gemini
- sending Gemini audio back to Exotel
- handling customer interruptions
- handling customer silence
- collecting transcripts
- analyzing completed calls
- maintaining customer history
- maintaining customer interest state
- maintaining a 0–100 conversation score
- maintaining Do Not Call state
- storing callback information
- finalizing Call records
- running callback checks

---

# 2. BACKEND DIRECTORY STRUCTURE

```text
backend/
│
├── server.js
│
├── agent/
│   └── voiceAgent.js
│
├── controllers/
│   ├── callController.js
│   └── customerController.js
│
├── database/
│   └── connection.js
│
├── models/
│   ├── Customer.js
│   └── Call.js
│
├── routes/
│   ├── callRoutes.js
│   ├── customerRoutes.js
│   └── exotelRoutes.js
│
├── services/
│   │
│   ├── call/
│   │   ├── callContext.js
│   │   ├── callFinalizer.js
│   │   └── callTranscript.js
│   │
│   ├── customer/
│   │   └── customerContext.js
│   │
│   ├── gemini/
│   │   ├── geminiLive.js
│   │   └── geminiPrompts.js
│   │
│   ├── callAnalysis.js
│   ├── callService.js
│   ├── customerService.js
│   ├── callbackService.js
│   └── callbackScheduler.js
│
└── transports/
    ├── browser.js
    │
    └── exotel/
        ├── exotelAudio.js
        ├── exotelCall.js
        ├── exotelCallService.js
        ├── exotelClient.js
        └── exotelStream.js
```

---

# 3. ARCHITECTURE RULES

Keep responsibilities separated.

```text
API routes
    ↓
Controllers

MongoDB structure
    ↓
Models

MongoDB operations
    ↓
Services

Customer lookup/context
    ↓
customer/customerContext.js

Call lifecycle
    ↓
call/

Gemini
    ↓
gemini/

Voice orchestration
    ↓
agent/

Exotel
    ↓
transports/exotel/

Callback
    ↓
callbackService.js
callbackScheduler.js
```

Important rule:

```text
MongoDB logic → services
MongoDB structure → models
Gemini behavior → gemini/
Exotel behavior → transports/exotel/
HTTP endpoints → routes/
HTTP request logic → controllers/
Call finalization → callFinalizer.js
Temporary live-call memory → callContext.js
Temporary transcript → callTranscript.js
```

---

# 4. COMPLETE OUTBOUND CALL FLOW

```text
POST /api/call
      ↓
callController.initiateCall()
      ↓
customerContext.getCustomerContext()
      ↓
Check customer.doNotCall
      ↓
callService.createCall()
      ↓
exotelCallService.initiateExotelFlowCall()
      ↓
Exotel places phone call
      ↓
Customer answers
      ↓
Exotel opens WebSocket
      ↓
exotelStream.handleExotelConnection()
      ↓
exotelCall.hydrateCallContext()
      ↓
exotelCall.ensureVoiceAgent()
      ↓
voiceAgent.createVoiceAgent()
      ↓
geminiLive.createGeminiLiveSession()
      ↓
Gemini starts conversation
```

After the call:

```text
Conversation
    ↓
Transcript
    ↓
Call Finalizer
    ↓
Call Analysis
    ↓
Customer Profile
    ↓
Customer MongoDB
    ↓
Call MongoDB
```

---

# 5. `server.js`

## Purpose

Main backend entry point.

## Responsibilities

- initialize environment variables
- initialize Express
- enable CORS
- register API routes
- connect MongoDB
- start callback scheduler
- create HTTP server
- create WebSocket servers
- route browser WebSocket connections
- route Exotel WebSocket connections

## API prefixes

```text
/api/call
/api/customers
/api/exotel
```

## WebSocket paths

```text
/media-stream
/exotel-stream
```

## Important relationships

```text
server.js
 ├── callRoutes.js
 ├── customerRoutes.js
 ├── exotelRoutes.js
 ├── database/connection.js
 ├── callbackScheduler.js
 ├── browser.js
 └── exotelStream.js
```

## Change this file when

- adding/removing backend routes
- changing server startup
- changing WebSocket routing
- changing database startup
- changing callback scheduler startup

---

# 6. ROUTES

## `routes/callRoutes.js`

### Purpose

Defines Call HTTP endpoints.

```text
POST /api/call
GET  /api/call
GET  /api/call/follow-ups
```

### Uses

```text
controllers/callController.js
```

The route file only maps URLs to controllers.

---

## `routes/customerRoutes.js`

### Purpose

Defines Customer HTTP endpoints.

Uses:

```text
controllers/customerController.js
```

---

## `routes/exotelRoutes.js`

### Purpose

Defines Exotel-related HTTP endpoints.

Current endpoint:

```text
GET /api/exotel/stream-url
```

Uses:

```text
transports/exotel/exotelCallService.js
```

---

# 7. CONTROLLERS

## `controllers/callController.js`

### Purpose

Handles frontend requests related to phone calls.

## `initiateCall(req, res)`

Starts an outbound call.

### Flow

```text
request.phoneNumber
      ↓
getCustomerContext()
      ↓
check doNotCall
      ↓
createCall()
      ↓
initiateExotelFlowCall()
      ↓
update Call with externalCallSid
      ↓
return response
```

### Important business rule

If:

```text
customerContext.doNotCall === true
```

the outbound call must be blocked.

---

## `getCalls(req, res)`

Returns recent Call records using:

```text
callService.listRecentCalls()
```

---

## `getPendingFollowUps(req, res)`

Returns pending callback records using:

```text
callService.listPendingFollowUps()
```

---

## `controllers/customerController.js`

### Purpose

Handles Customer API requests.

Typical responsibilities:

- retrieve customers
- return customer data
- call customer service functions

It should not contain the main MongoDB business logic.

---

# 8. DATABASE CONNECTION

## `database/connection.js`

### Purpose

Creates the MongoDB connection.

Responsibilities:

- read MongoDB configuration
- connect to MongoDB
- report success/failure

---

# 9. CUSTOMER MODEL

## `models/Customer.js`

### Purpose

Defines the MongoDB structure for a Customer.

### Main fields

```text
customerId
name
phoneNumber
email
source

conversationSummary
conversationRate

latestSummary
latestCallId
latestCallAt

interestStatus
doNotCall

followUpRequired
followUpDate
followUpAt
callbackReason
```

### `customerId`

Internal unique customer ID.

Example:

```text
CUS_29ce1bba-d49f-486e-8a20-c7ef09eebb83
```

### `name`

Customer name.

A single name is valid. Placeholder values such as `unknown`, `customer`, `none`, `not sure`, or `don't know` must not be saved as real names.

### `phoneNumber`

Normalized Indian phone number.

Example:

```text
+918197983277
```

### `email`

Optional. The current voice flow does not require email and the AI should not ask for it.

### `source`

Shows where the Customer record originated, such as `crm`, `call`, or `browser`.

---

# 10. CUSTOMER OVERALL HISTORY

## `conversationSummary`

Stores the important combined history across calls.

It is NOT only the latest call.

```text
Call 1
   +
Call 2
   +
Call 3
   +
Current Call
   ↓
Customer.conversationSummary
```

Target length:

```text
3–4 concise lines
```

Important information can include:

- vehicle/model interest
- daily kilometres
- travel routine
- primary usage
- charging situation
- budget
- purchase timeline
- objections
- important customer preferences
- current interest context

Repeated information should be consolidated.

---

# 11. CUSTOMER CONVERSATION RATE

## `conversationRate`

Range:

```text
0–100
```

This is a customer-level overall interest/engagement score.

It is NOT simply the latest Call's `interestStatus`.

The score uses:

```text
previous conversation history
+
previous conversationRate
+
current call
+
current interest status
```

General interpretation:

```text
90–100 → very strong interest
75–89  → strong interest
60–74  → positive interest
40–59  → mixed / uncertain
20–39  → weak interest
1–19   → very low interest
0      → explicitly not interested
```

This is a CRM signal, not a guaranteed probability of purchase.

If the customer explicitly says they are not interested:

```text
conversationRate = 0
doNotCall = true
```

---

# 12. CUSTOMER INTEREST STATUS

## `interestStatus`

Possible values:

```text
interested
not_interested
uncertain
null
```

The current Call analysis determines the current call's interest state.

Previous calls provide context but should not automatically decide the current call.

---

# 13. DO NOT CALL

## `doNotCall`

Possible values:

```text
true
false
```

If the customer clearly says they are not interested:

```text
interestStatus = not_interested
conversationRate = 0
doNotCall = true
```

Once `doNotCall` is true:

- manual call initiation must be blocked
- scheduled callback must be blocked
- pending callback information must be cleared

Callback fields should become:

```text
followUpRequired = false
followUpDate = null
followUpAt = null
callbackReason = null
```

---

# 14. CALLBACK FIELDS

## `followUpRequired`

Whether the customer requested a callback/follow-up.

## `followUpDate`

Requested callback date even when no time was provided.

## `followUpAt`

Exact callback date and time when available.

## `callbackReason`

Reason for the callback.

---

# 15. CALL MODEL

## `models/Call.js`

### Purpose

Defines the MongoDB structure for one phone call.

### Main fields

```text
callId
externalCallSid
customerId
phoneNumber

direction
status

startedAt
answeredAt
endedAt
durationSeconds

summary
language
interestStatus

followUpRequired
followUpDate
followUpAt

callbackStatus
callbackReason
nextAction
summaryStatus
```

### `callId`

Internal Call ID.

### `externalCallSid`

Exotel's Call SID, used to map Exotel events to the internal Call.

### `customerId`

Links the Call to the Customer:

```text
Call.customerId
      ↓
Customer.customerId
```

### `direction`

```text
inbound
outbound
```

### `status`

```text
created
initiated
ringing
answered
completed
failed
```

### `summary`

Summary of ONE call only.

### `language`

Main language or languages used in the call.

### `summaryStatus`

```text
pending
completed
failed
```

---

# 16. CUSTOMER SERVICE

## `services/customerService.js`

### Purpose

Handles Customer MongoDB operations.

### Important functions

```text
getValidCustomerName()
normalizeCustomerPhoneNumber()

createCustomer()
findOrCreateCustomerByPhoneNumber()
findOrCreateCustomerByName()

getCustomerById()
getCustomerByPhoneNumber()

updateCustomerSummary()
updateCustomerName()
updateCustomerAfterCall()

listCustomers()
```

## `getValidCustomerName(name)`

Validates names before storage.

Rejects placeholder values including:

```text
unknown
unknown customer
customer
none
null
not known
not sure
don't know
dont know
no name
```

Accepts a single name.

## `normalizeCustomerPhoneNumber(phoneNumber)`

Normalizes supported Indian phone-number formats into the standard stored form.

## `createCustomer()`

Creates a Customer document.

## `findOrCreateCustomerByPhoneNumber()`

Main call-time customer lookup/create function:

```text
Phone number
   ↓
Normalize
   ↓
Find existing customer
   ↓
Existing?
 ├── Yes → return existing
 └── No  → create customer
```

## `findOrCreateCustomerByName()`

Finds or creates a Customer by name.

## `getCustomerById(customerId)`

Finds a Customer by internal ID.

## `getCustomerByPhoneNumber(phoneNumber)`

Finds a Customer by normalized phone number.

## `updateCustomerSummary(customerId, summary)`

Updates `Customer.conversationSummary`.

## `updateCustomerName(customerId, name)`

Updates the customer name after validation.

## `updateCustomerAfterCall(...)`

Updates the final customer state after a completed call.

It can update:

```text
latestCallId
latestCallAt
name
conversationSummary
conversationRate
interestStatus
doNotCall
followUpRequired
followUpDate
followUpAt
callbackReason
```

If current analysis is `not_interested`, it must force:

```text
conversationRate = 0
doNotCall = true
followUpRequired = false
followUpDate = null
followUpAt = null
callbackReason = null
```

## `listCustomers(limit)`

Returns customers for the CRM/dashboard.

---

# 17. CUSTOMER CONTEXT

## `services/customer/customerContext.js`

### Purpose

Loads customer information BEFORE an outbound call.

This file is primarily for reading customer information.

## `normalizePhoneNumber(phone)`

Normalizes a phone number for lookup.

## `findCustomerByPhone(phone)`

Searches supported Indian phone-number formats.

## `getCustomerContext(phone)`

Returns:

```text
customerExists
customerId
customerName
firstName
previousSummary
conversationRate
interestStatus
doNotCall
phoneNumber
customer
```

For a new customer:

```text
customerExists = false
```

For an existing customer it loads the stored customer history and state.

---

# 18. CALL SERVICE

## `services/callService.js`

### Purpose

Handles MongoDB operations for Call documents.

### Functions

```text
createCall()
updateCall()
getCallById()
getCallByExternalSid()
updateCallByExternalSid()
listRecentCalls()
listPendingFollowUps()
```

## `createCall(...)`

Creates a Call record at the beginning of the call.

Typical starting state:

```text
summary = null
summaryStatus = pending
```

## `updateCall(callId, updates)`

Updates a Call using `$set`.

Used for:

- answered state
- completed state
- failed state
- summary
- duration
- interest
- callback
- next action
- finalization

## `getCallById(callId)`

Finds a Call by internal ID.

## `getCallByExternalSid(externalCallSid)`

Finds a Call by Exotel Call SID.

## `updateCallByExternalSid(externalCallSid, updates)`

Updates a Call using Exotel Call SID.

## `listRecentCalls(limit)`

Returns recent calls.

## `listPendingFollowUps(limit)`

Returns Calls where:

```text
followUpRequired = true
callbackStatus = pending
followUpAt != null
```

---

# 19. TEMPORARY CALL CONTEXT

## `services/call/callContext.js`

### Purpose

Stores temporary active-call data in memory.

Typical values:

```text
callId
customerId
customerName
firstName
previousSummary
customerExists
phoneNumber
```

### Functions

```text
setCallContext()
getCallContext()
removeCallContext()
hasCallContext()
```

MongoDB remains the permanent source of truth.

---

# 20. CALL TRANSCRIPT

## `services/call/callTranscript.js`

### Purpose

Stores the temporary conversation while a Call is active.

### Functions

```text
createTranscript()
addTranscript()
clearTranscript()
```

Messages use:

```text
{
  type: "user",
  text: "..."
}
```

or:

```text
{
  type: "assistant",
  text: "..."
}
```

The transcript is used by `callAnalysis.js` after the call ends.

---

# 21. CALL ANALYSIS

## `services/callAnalysis.js`

### Purpose

Analyzes a completed conversation using Gemini.

This is POST-CALL analysis. It does not manage live phone audio.

## `analyzeCall(conversation)`

Returns:

```text
customerName
summary
language
interestStatus
followUpRequired
callbackDate
callbackTime
callbackReason
nextAction
```

### Name rules

- use a name only when the customer explicitly provides it
- single-word names are valid
- never guess a name
- ignore placeholders

### Interest rules

```text
interested
not_interested
uncertain
```

`not_interested` is only for clear rejection or explicit lack of interest.

`uncertain` is used when evidence is insufficient.

Previous calls should not automatically decide the current Call's interest.

### Callback analysis

The analysis can understand requests such as:

```text
Call me tomorrow
Call me tomorrow at 10 AM
Call me Friday
Call me after 20 minutes
Call me after 2 hours
Call me on October 5th
```

and returns:

```text
callbackDate
callbackTime
```

using India time.

---

# 22. CUSTOMER PROFILE GENERATION

## `buildCustomerConversationProfile(...)`

Creates the updated Customer history and score.

### Input

```text
previousSummary
previousConversationRate
currentSummary
currentInterestStatus
```

### Output

```text
summary
conversationRate
```

### Summary flow

```text
Previous customer history
       +
Current call summary
       ↓
New combined customer summary
```

The summary should usually be 3–4 concise lines.

Prioritize useful customer information such as vehicle/model, daily kilometres, routine, usage, charging, budget, timeline, objections, and current interest.

### Score flow

```text
Previous score/history
       +
Current conversation
       +
Current interest
       ↓
New 0–100 conversationRate
```

If current interest is `not_interested`:

```text
conversationRate = 0
```

---

# 23. CALL FINALIZER

## `services/call/callFinalizer.js`

### Purpose

Runs when a Call ends and persists final Call and Customer information.

## Main flow

```text
Call ends
   ↓
Resolve Call
   ↓
Calculate duration
   ↓
Analyze conversation
   ↓
Find/Create Customer
   ↓
Load previous summary
   ↓
Load previous conversationRate
   ↓
Build customer profile
   ↓
Update Customer
   ↓
Update Call
   ↓
Finish
```

## `resolveCall(...)`

Finds a Call by `callId` or `externalCallSid`.

## `updateExistingCall(...)`

Updates the correct Call by available identifier.

## `buildFollowUpDate(callbackDate)`

Converts the callback date into an India-time Date.

## `buildFollowUpAt(callbackDate, callbackTime)`

Converts exact callback date/time into an India-time Date.

## `finalizeCall(...)`

Main finalization function.

It:

- resolves the Call
- calculates duration
- handles empty transcripts
- analyzes the current conversation
- finds or creates Customer
- loads previous Customer summary
- loads previous conversation rate
- builds updated Customer profile
- stores conversationRate
- updates interest state
- updates Do Not Call state
- updates callback state
- updates Call status/summary/duration
- marks summary complete

---

# 24. GEMINI LIVE

## `services/gemini/geminiLive.js`

### Purpose

Manages the realtime Gemini Live session.

Connection:

```text
Voice Agent
   ↕
Gemini Live
```

## `createGeminiLiveSession(...)`

Creates one Gemini Live session for the Call.

Callbacks include:

```text
onAudio
onTranscript
onInterrupted
onResponseStart
onResponseComplete
onError
onClose
```

## `sendAudio(base64Audio)`

Sends customer PCM audio to Gemini.

Current input format:

```text
PCM 16kHz
```

## `sendText(text)`

Sends realtime text instructions into the active Gemini session.

Used for functions such as no-response reminders.

## `isOpen()`

Checks whether Gemini is connected.

## `isClosed()`

Checks whether the Gemini session is closed.

## `close()`

Closes the Gemini Live session.

### Interruption

When Gemini reports:

```text
serverContent.interrupted === true
```

the current AI response is treated as interrupted.

---

# 25. GEMINI PROMPTS

## `services/gemini/geminiPrompts.js`

### Purpose

Controls AI personality and conversational behavior.

This is the main file for changing what the AI is instructed to do/say.

Important behavior areas:

- natural conversation
- short responses
- one question at a time
- Kannada / English / mixed language
- customer name collection
- EV requirement discovery
- callbacks
- interest handling
- natural acknowledgements
- no-response reminders
- no internal system discussion
- no invented Tejo EV information

---

# 26. OUTBOUND CALL BEHAVIOR

The AI is making an outbound call.

It should NOT start as an inbound support assistant with:

```text
I'm a sales representative. How can I help you?
```

Instead it should naturally explain that it is calling from Tejo EV to understand the customer's EV requirements.

---

# 27. NEW CUSTOMER DISCOVERY

The AI should naturally understand:

```text
customer name
EV type
model/category
Daily kilometres
normal travel routine
main usage
charging situation
purchase timeline
budget
```

The AI must not ask all questions together.

Correct pattern:

```text
Ask
 ↓
Listen
 ↓
React
 ↓
Ask the next relevant question
```

If the customer already provides information, do not ask for it again.

---

# 28. NATURAL ACKNOWLEDGEMENTS

The AI can naturally acknowledge useful information.

Examples:

```text
Super, got it.
Okay, understood.
Perfect, that's helpful.
Sure, makes sense.
Great, I got that.
Sari, got it.
Chennagide, understood.
```

Rules:

- do not acknowledge every sentence
- do not repeat one phrase constantly
- match the customer's language
- keep the acknowledgement short
- avoid sounding scripted

Example:

```text
Customer:
Naanu daily 40 kilometre travel maadtini.

AI:
Super, got it. Mostly office travel aa?
```

---

# 29. LANGUAGE BEHAVIOR

Supported styles:

```text
Kannada
English
Kannada + English
```

```text
Kannada customer
    ↓
Primarily Kannada

English customer
    ↓
English

Kannada-English customer
    ↓
Natural mixed conversation
```

Do not randomly switch languages.

---

# 30. NAME COLLECTION

For a new customer whose name is unknown:

```text
Name unknown
    ↓
Ask naturally
    ↓
Customer provides name
    ↓
Store valid name
```

A single name is valid.

Do not require first name + last name.

Do not ask for phone number.

Do not ask for email.

Do not invent a name.

---

# 31. RETURNING CUSTOMER BEHAVIOR

The AI receives `conversationSummary` as background context.

It should:

- use known information
- avoid unnecessary repeated questions
- verify information if it may have changed
- continue naturally from previous calls
- not treat an old callback request as proof of current interest
- determine current interest from the current conversation

---

# 32. INITIAL GREETING

## `buildInitialGreeting(...)`

Starts the conversation.

For a new customer:

```text
Introduce yourself as Prajwal from Tejo EV
        ↓
Explain the reason for calling
        ↓
Ask customer name
        ↓
Start EV discovery
```

Example style:

```text
Namaskara! Naanu Prajwal, Tejo EV inda maatadthidini.
Nimge yaava type EV beku anta nodtiddira?
Modalu nimma hesaru tilkobahuda?
```

The wording should vary naturally.

---

# 33. NO-RESPONSE REMINDER

## `buildNoResponseReminderPrompt(...)`

Used when the customer is silent after the AI finishes speaking.

Reminder language must match the language/style of the conversation.

Examples:

Kannada:

```text
Arjun, iddeera?
```

English:

```text
Arjun, are you there?
```

Kannada-English:

```text
Arjun, line alli iddeera?
```

Rules:

- use customer name when available
- match current language
- vary wording
- remain short
- remain natural
- do not mention timers
- do not mention silence detection
- do not sound robotic

---

# 34. NO-RESPONSE TIMING

Current intended behavior:

```text
AI finishes speaking
        ↓
5 seconds
        ↓
Reminder 1
        ↓
5 seconds
        ↓
Reminder 2
        ↓
5 seconds
        ↓
Reminder 3
        ↓
3 seconds
        ↓
Disconnect
```

Total:

```text
18 seconds
```

Important:

The timer measures customer inactivity.

If the customer speaks:

```text
Customer speech
      ↓
No-response timer reset
```

The AI reminder does NOT count as customer activity.

---

# 35. VOICE AGENT

## `agent/voiceAgent.js`

### Purpose

Orchestrates the connection between the Call and Gemini.

```text
Exotel Call
    ↕
Voice Agent
    ↕
Gemini Live
```

## `createVoiceAgent(...)`

Creates the Gemini Live session and connects callbacks.

Receives customer context such as:

```text
customerExists
customerName
firstName
previousSummary
```

Responsibilities:

- create Gemini session
- send initial greeting
- forward customer audio
- forward Gemini audio
- forward transcripts
- handle interruption
- handle response start
- handle response complete
- handle errors
- close session

Returned methods:

```text
sendAudio()
sendText()
isOpen()
close()
```

---

# 36. EXOTEL STREAM

## `transports/exotel/exotelStream.js`

### Purpose

Main Exotel WebSocket handler.

Receives:

```text
connected
start
media
dtmf
mark
stop
```

Coordinates:

```text
Exotel client
Exotel audio
Exotel call manager
Voice Agent
customer activity
silence timers
call finalization
```

## `handleExotelConnection(ws, request)`

Creates state for one active Exotel call.

Important state includes:

```text
voiceAgent
voiceAgentPromise
callContext
callContextPromise
callSid
streamSid
internalCallId
conversation
audio queues
audio timers
audioGeneration
responseGeneration
customer speech detection
no-response timer state
```

---

# 37. EXOTEL CALL MANAGER

## `transports/exotel/exotelCall.js`

### Purpose

Controls one Exotel call's lifecycle.

Responsibilities:

- load call context
- load customer context
- create Call
- create Voice Agent
- collect transcript
- finalize Call
- clean temporary state

## `ensureCallContext(data)`

Loads the active context.

## `hydrateCallContext(data)`

Loads:

```text
Call
Customer
Customer ID
Customer name
First name
Conversation summary
Phone
```

and creates missing Call data when required.

### Concurrency protection

Uses `callContextPromise` to prevent simultaneous hydration operations.

## `ensureVoiceAgent(data)`

Creates exactly one Voice Agent.

Uses `voiceAgentPromise` to prevent multiple Gemini sessions from being created by concurrent Exotel media events.

## `finalizeCurrentCall(reason)`

Calls:

```text
callFinalizer.finalizeCall()
```

then removes temporary context.

---

# 38. EXOTEL AUDIO

## `transports/exotel/exotelAudio.js`

### Purpose

Handles:

- resampling
- buffering
- playback
- speech detection
- interruption handling

## `StreamingPcm16Resampler`

Converts Gemini 24kHz PCM into the Exotel stream rate.

## `calculateRmsFromBase64(base64Audio)`

Calculates RMS level from incoming customer audio.

## `configureExotelMediaFormat(mediaFormat)`

Updates:

```text
sample rate
chunk size
playback duration
resampler
```

## `clearLocalAudio()`

Clears:

```text
audio queue
output buffer
pending audio
playback timer
resampler state
```

Used during interruption and call termination.

## `handleCustomerSpeech(rms)`

Detects customer speech.

If AI is speaking, customer speech can cause an interruption.

If AI is not speaking, customer speech is treated as customer activity and resets the no-response timer.

## `queueAudioForExotel(base64Audio, generation)`

```text
Gemini audio
    ↓
Resample
    ↓
PCM buffer
    ↓
Exotel chunks
    ↓
Queue
    ↓
Playback
```

Generation checks prevent stale interrupted audio from being sent.

## `processAudioQueue()`

Sends queued audio chunks to Exotel.

## `startAudioPlayback()`

Starts queued audio playback.

## `flushPartialOutputAudio()`

Sends remaining partial Gemini output after a response finishes.

## `flushPendingAudio()`

Sends audio that arrived before stream readiness.

---

# 39. EXOTEL CLIENT

## `transports/exotel/exotelClient.js`

### Purpose

Low-level Exotel WebSocket operations.

## `getExotelCallSid(data, url)`

Extracts the Exotel Call SID from URL/events.

## `getExotelPhoneNumber(data, url)`

Extracts customer phone number.

## `createExotelClient(ws, state)`

Provides:

```text
setStreamSid()
clearExotelAudio()
sendOneAudioChunk()
```

## `setStreamSid(streamSid)`

Stores the active Exotel stream SID.

## `clearExotelAudio()`

Sends an Exotel clear command, mainly for interruption handling.

## `sendOneAudioChunk(chunk)`

Sends one audio chunk to Exotel.

---

# 40. EXOTEL CALL SERVICE

## `transports/exotel/exotelCallService.js`

### Purpose

Starts outbound phone calls through the Exotel REST API.

Responsibilities:

- create outbound call
- pass call/customer information
- receive Exotel Call SID
- provide public stream URL

This file does NOT manage the live audio WebSocket.

---

# 41. BROWSER TRANSPORT

## `transports/browser.js`

### Purpose

Handles browser-side media/WebSocket transport.

It is separate from the Exotel production transport.

---

# 42. CALLBACK SERVICE

## `services/callbackService.js`

### Purpose

Finds and manages due callbacks.

## `findDueCallbacks()`

Looks for Calls where:

```text
followUpRequired = true
callbackStatus = pending
followUpAt <= current time
```

It also checks Customer state.

Customers with:

```text
doNotCall = true
```

must not be returned as callable callbacks.

## `markCallbackProcessing(callId)`

Changes:

```text
pending
↓
processing
```

to help prevent duplicate processing.

## `markCallbackCompleted(callId)`

Changes:

```text
processing
↓
completed
```

---

# 43. CALLBACK SCHEDULER

## `services/callbackScheduler.js`

### Purpose

Periodically checks callback records.

## `checkCallbacks()`

Flow:

```text
Find due callbacks
      ↓
For each callback
      ↓
markCallbackProcessing()
      ↓
Ready for callback execution
```

Current check interval:

```text
60 seconds
```

## `startCallbackScheduler()`

Starts the scheduler when the backend starts.

---

# 44. LIVE AUDIO FLOW

## Customer → Gemini

```text
Customer speaks
      ↓
Exotel media event
      ↓
exotelStream.js
      ↓
RMS detection
      ↓
Voice Agent
      ↓
Gemini Live
```

## Gemini → Customer

```text
Gemini generates audio
      ↓
Voice Agent
      ↓
exotelAudio.js
      ↓
24kHz → Exotel rate
      ↓
PCM chunks
      ↓
Exotel client
      ↓
Customer phone
```

---

# 45. INTERRUPTION FLOW

```text
AI speaking
    ↓
Customer starts speaking
    ↓
RMS detects speech
    ↓
Customer interruption
    ↓
Clear local AI audio
    ↓
Clear Exotel playback
    ↓
Increase audio generation
    ↓
Customer speech continues to Gemini
```

Purpose: prevent AI from continuing to speak over the customer.

---

# 46. NO-RESPONSE FLOW

```text
AI finishes speaking
       ↓
Customer silent
       ↓
5 sec
       ↓
Reminder 1
       ↓
Customer still silent
       ↓
10 sec
       ↓
Reminder 2
       ↓
Customer still silent
       ↓
15 sec
       ↓
Reminder 3
       ↓
Customer still silent
       ↓
18 sec
       ↓
Disconnect
```

Customer speech at any time:

```text
Customer speech
      ↓
Reset timer
```

---

# 47. CALL FINALIZATION FLOW

```text
Call ends
   ↓
finalizeCurrentCall()
   ↓
finalizeCall()
   ↓
resolveCall()
   ↓
calculate duration
   ↓
analyzeCall()
   ↓
find/create Customer
   ↓
load Customer history
   ↓
buildCustomerConversationProfile()
   ↓
new conversationSummary
   ↓
new conversationRate
   ↓
updateCustomerAfterCall()
   ↓
update Call
   ↓
clear temporary context
```

---

# 48. CUSTOMER PROFILE FLOW

```text
Previous Customer Summary
        +
Previous conversationRate
        +
Current Call Summary
        +
Current Call Interest
        ↓
Customer Profile Analysis
        ↓
3–4 line conversationSummary
        +
0–100 conversationRate
        ↓
Customer MongoDB
```

---

# 49. NOT INTERESTED FLOW

```text
Customer:
"I'm not interested."
        ↓
analyzeCall()
        ↓
interestStatus = not_interested
        ↓
callFinalizer
        ↓
conversationRate = 0
        ↓
Customer.doNotCall = true
        ↓
callback information cleared
        ↓
future call blocked
        ↓
future callback blocked
```

---

# 50. NEW CUSTOMER FLOW

```text
Customer not found
        ↓
New outbound Call
        ↓
AI introduces itself
        ↓
AI asks customer's name
        ↓
Customer provides name
        ↓
AI asks about EV requirement
        ↓
AI gathers:
   - EV type
   - model
   - daily km
   - routine
   - usage
   - charging
   - budget
   - purchase timeline
        ↓
Call ends
        ↓
Customer created/updated
        ↓
Summary + score stored
```

---

# 51. RETURNING CUSTOMER FLOW

```text
Phone number
      ↓
Customer found
      ↓
Load:
  name
  conversationSummary
  conversationRate
  interestStatus
  doNotCall
      ↓
Check Do Not Call
      ↓
Create Call
      ↓
Exotel
      ↓
Voice Agent
      ↓
Gemini receives history
      ↓
Conversation continues naturally
```

---

# 52. CURRENT BUSINESS RULES

## Rule 1 — Phone number

The phone number is already known. The AI should not ask for it.

## Rule 2 — Email

Email is not required. The AI should not ask for it.

## Rule 3 — Name

For a new customer whose name is unknown, ask naturally during the conversation.

A single name is valid.

## Rule 4 — Outbound sales discovery

The AI is proactively calling the customer. It should not behave like an inbound support bot.

## Rule 5 — One question at a time

Do not dump several questions into one response.

## Rule 6 — Current interest

Current call interest is based on the current conversation.

## Rule 7 — Combined customer memory

Customer history is consolidated into `conversationSummary` instead of storing only the latest summary.

## Rule 8 — Conversation score

`conversationRate` is a customer-level 0–100 score based on the overall relationship/history.

## Rule 9 — Not Interested

Explicit rejection forces:

```text
interestStatus = not_interested
conversationRate = 0
doNotCall = true
```

## Rule 10 — Uncertain

If interest cannot be determined:

```text
interestStatus = uncertain
```

Do not automatically convert uncertain into not interested.

## Rule 11 — Callback

If a customer asks for a callback:

```text
followUpRequired = true
```

If date is known:

```text
followUpDate = date
```

If exact time is known:

```text
followUpAt = exact timestamp
```

If only date is known:

```text
followUpDate = date
followUpAt = null
```

## Rule 12 — Silence

```text
5 sec → reminder
10 sec → reminder
15 sec → reminder
18 sec → disconnect
```

Customer speech resets the timer.

---

# 53. DEBUGGING MAP

## AI does not speak

Check:

```text
services/gemini/geminiLive.js
agent/voiceAgent.js
transports/exotel/exotelCall.js
transports/exotel/exotelAudio.js
transports/exotel/exotelStream.js
```

## Customer cannot interrupt AI

Check:

```text
transports/exotel/exotelAudio.js
transports/exotel/exotelStream.js
services/gemini/geminiLive.js
transports/exotel/exotelClient.js
```

## AI speaks over customer

Check:

```text
SPEECH_RMS_THRESHOLD
REQUIRED_SPEECH_FRAMES
handleCustomerSpeech()
clearLocalAudio()
clearExotelAudio()
```

Main file:

```text
transports/exotel/exotelAudio.js
```

## Multiple AI voices/greetings

Check:

```text
voiceAgentPromise
callContextPromise
ensureVoiceAgent()
hydrateCallContext()
```

Files:

```text
transports/exotel/exotelCall.js
transports/exotel/exotelStream.js
```

## AI reminder language is wrong

Check:

```text
services/gemini/geminiPrompts.js
transports/exotel/exotelStream.js
services/gemini/geminiLive.js
```

## Silence timeout is wrong

Check:

```text
transports/exotel/exotelStream.js
```

Important state/functions:

```text
noResponseTimer
noResponseStartedAt
noResponseReminderCount
startNoResponseMonitoring()
scheduleNoResponseCheck()
sendNoResponseReminder()
disconnectForNoResponse()
```

## Customer is not created

Check:

```text
services/call/callFinalizer.js
services/customerService.js
services/customer/customerContext.js
```

Also verify the Call phone number and `finalizeCurrentCall()` execution.

## Call remains `answered`

Check:

```text
transports/exotel/exotelStream.js
transports/exotel/exotelCall.js
services/call/callFinalizer.js
services/callService.js
```

## Call summary is null

Check:

```text
services/call/callTranscript.js
transports/exotel/exotelCall.js
services/call/callFinalizer.js
services/callAnalysis.js
```

## Customer summary not updating

Check:

```text
services/callAnalysis.js
buildCustomerConversationProfile()
services/call/callFinalizer.js
services/customerService.js
models/Customer.js
```

## Conversation rate missing

Check:

```text
models/Customer.js
services/callAnalysis.js
buildCustomerConversationProfile()
services/call/callFinalizer.js
services/customerService.js
```

## Not Interested does not block future calls

Check:

```text
services/callAnalysis.js
services/customerService.js
models/Customer.js
controllers/callController.js
services/callbackService.js
```

---

# 54. FILE RESPONSIBILITY MAP

| What needs to change           | Main file                                |
| ------------------------------ | ---------------------------------------- |
| Customer MongoDB fields        | `models/Customer.js`                     |
| Call MongoDB fields            | `models/Call.js`                         |
| Customer creation              | `services/customerService.js`            |
| Customer updates               | `services/customerService.js`            |
| Customer pre-call lookup       | `services/customer/customerContext.js`   |
| Customer summary               | `services/callAnalysis.js`               |
| Customer conversation rate     | `services/callAnalysis.js`               |
| Current call interest analysis | `services/callAnalysis.js`               |
| Call creation                  | `services/callService.js`                |
| Call update                    | `services/callService.js`                |
| Call finalization              | `services/call/callFinalizer.js`         |
| Temporary call context         | `services/call/callContext.js`           |
| Temporary transcript           | `services/call/callTranscript.js`        |
| Gemini realtime connection     | `services/gemini/geminiLive.js`          |
| Gemini behavior/prompts        | `services/gemini/geminiPrompts.js`       |
| Voice Agent orchestration      | `agent/voiceAgent.js`                    |
| Exotel WebSocket               | `transports/exotel/exotelStream.js`      |
| Exotel audio                   | `transports/exotel/exotelAudio.js`       |
| Exotel call lifecycle          | `transports/exotel/exotelCall.js`        |
| Exotel WebSocket operations    | `transports/exotel/exotelClient.js`      |
| Start Exotel call              | `transports/exotel/exotelCallService.js` |
| Callback lookup                | `services/callbackService.js`            |
| Callback scheduler             | `services/callbackScheduler.js`          |
| Call API                       | `controllers/callController.js`          |
| Customer API                   | `controllers/customerController.js`      |
| HTTP route mapping             | `routes/`                                |
| Server startup                 | `server.js`                              |
| MongoDB connection             | `database/connection.js`                 |

---

# 55. ONE-LINE DESCRIPTION OF EVERY BACKEND FILE

```text
server.js
→ Starts the backend and connects the major systems.

routes/callRoutes.js
→ Defines Call endpoints.

routes/customerRoutes.js
→ Defines Customer endpoints.

routes/exotelRoutes.js
→ Defines Exotel-related endpoints.

controllers/callController.js
→ Handles frontend requests to start/retrieve calls.

controllers/customerController.js
→ Handles frontend Customer requests.

database/connection.js
→ Connects to MongoDB.

models/Customer.js
→ Defines the Customer MongoDB schema.

models/Call.js
→ Defines the Call MongoDB schema.

services/customerService.js
→ Creates, finds, validates, and updates Customers.

services/customer/customerContext.js
→ Loads Customer information before a call.

services/callService.js
→ Creates, finds, and updates Call records.

services/call/callContext.js
→ Stores temporary active-call state.

services/call/callTranscript.js
→ Stores temporary active-call conversation.

services/call/callFinalizer.js
→ Finalizes a Call and persists final results.

services/callAnalysis.js
→ Analyzes completed conversations and creates customer profile data.

services/gemini/geminiLive.js
→ Maintains the realtime Gemini connection.

services/gemini/geminiPrompts.js
→ Defines Gemini's conversational behavior.

agent/voiceAgent.js
→ Orchestrates Voice Agent ↔ Gemini.

transports/exotel/exotelStream.js
→ Main Exotel WebSocket controller.

transports/exotel/exotelAudio.js
→ Handles audio conversion, buffering, playback, and speech detection.

transports/exotel/exotelCall.js
→ Manages the lifecycle of one Exotel Call.

transports/exotel/exotelClient.js
→ Handles low-level Exotel WebSocket operations.

transports/exotel/exotelCallService.js
→ Starts outbound calls through Exotel.

transports/browser.js
→ Handles browser transport.

services/callbackService.js
→ Finds and manages due callbacks.

services/callbackScheduler.js
→ Periodically checks callbacks.
```

---

# 56. HOW TO REQUEST FILES FOR A FUTURE CHANGE

When a future change is requested, use this document to identify the responsible file first.

Do not ask for every backend file automatically.

Ask only for the current files needed to understand and safely make that specific change.

Examples:

## If changing AI wording/behavior

Start with:

```text
services/gemini/geminiPrompts.js
```

Also request when relevant:

```text
agent/voiceAgent.js
services/gemini/geminiLive.js
```

---

## If changing customer history/score

Request:

```text
models/Customer.js
services/customerService.js
services/customer/customerContext.js
services/callAnalysis.js
services/call/callFinalizer.js
```

---

## If changing Call storage

Request:

```text
models/Call.js
services/callService.js
services/call/callFinalizer.js
```

---

## If changing silence behavior

Request:

```text
transports/exotel/exotelStream.js
transports/exotel/exotelAudio.js
transports/exotel/exotelCall.js
services/gemini/geminiPrompts.js
```

---

## If changing interruption behavior

Request:

```text
transports/exotel/exotelAudio.js
transports/exotel/exotelStream.js
transports/exotel/exotelClient.js
services/gemini/geminiLive.js
```

---

## If changing callback behavior

Request:

```text
services/callbackService.js
services/callbackScheduler.js
models/Call.js
models/Customer.js
controllers/callController.js
```

---

## If changing outbound call initiation

Request:

```text
controllers/callController.js
services/customer/customerContext.js
services/callService.js
transports/exotel/exotelCallService.js
```

---

# 57. CHANGE PROCESS

For future development:

```text
Read MASTER_BACKEND.md
        ↓
Identify responsible file
        ↓
Ask user for current version of that file
        ↓
Ask for directly related files only if necessary
        ↓
Review actual current code
        ↓
Understand existing behavior
        ↓
Make the required change
        ↓
Preserve working behavior that is unrelated
```

---

# 58. FINAL BACKEND MENTAL MODEL

The entire backend can be understood as six layers:

```text
LAYER 1 — API
routes/
controllers/

        ↓

LAYER 2 — DATA
models/
MongoDB services

        ↓

LAYER 3 — CALL MEMORY
callContext.js
callTranscript.js

        ↓

LAYER 4 — AI
geminiLive.js
geminiPrompts.js
voiceAgent.js
callAnalysis.js

        ↓

LAYER 5 — TELEPHONY
transports/exotel/

        ↓

LAYER 6 — CALLBACK
callbackService.js
callbackScheduler.js
```

The core principle is:

```text
CALL
=
one phone conversation

CUSTOMER
=
long-term customer memory

GEMINI
=
conversation intelligence

EXOTEL
=
telephony and realtime audio

MONGODB
=
permanent application state
```

---

# 59. QUICK REFERENCE

If the problem is about:

```text
AI words
→ geminiPrompts.js

AI realtime connection
→ geminiLive.js

Voice Agent
→ voiceAgent.js

Customer history
→ customerService.js
→ customerContext.js
→ callAnalysis.js
→ callFinalizer.js

Customer score
→ callAnalysis.js
→ customerService.js
→ Customer.js

Current call summary
→ callAnalysis.js
→ Call.js

Call finalization
→ callFinalizer.js

Live Exotel connection
→ exotelStream.js

Audio quality
→ exotelAudio.js

Interruptions
→ exotelAudio.js
→ exotelClient.js

Multiple Gemini sessions
→ exotelCall.js
→ exotelStream.js

Silence/reminders
→ exotelStream.js
→ exotelAudio.js
→ geminiPrompts.js

Customer not interested
→ callAnalysis.js
→ customerService.js
→ callController.js
→ callbackService.js

Callback
→ callbackService.js
→ callbackScheduler.js

Call database
→ Call.js
→ callService.js

Customer database
→ Customer.js
→ customerService.js
```

---

# 60. MOST IMPORTANT RELATIONSHIP

```text
Customer
   │
   │ customerId
   │
   ├──────── Call 1
   ├──────── Call 2
   ├──────── Call 3
   └──────── Call 4
```

Each Call stores what happened in one conversation.

The Customer stores what the system has learned across all conversations.

That separation is the foundation of the project.
