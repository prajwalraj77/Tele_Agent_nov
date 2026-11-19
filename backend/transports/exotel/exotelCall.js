// ============================================================
// EXOTEL CALL
// ============================================================
// Manages call context, Voice Agent lifecycle, and finalization.
// ============================================================

const { randomUUID } = require("crypto");

const { createVoiceAgent } = require("../../agent/voiceAgent");

const {
  getCallContext,
  setCallContext,
  removeCallContext,
} = require("../../services/call/callContext");

const {
  createCall,
  getCallByExternalSid,
} = require("../../services/callService");

const {
  getCustomerContext,
} = require("../../services/customer/customerContext");

const { finalizeCall } = require("../../services/call/callFinalizer");

const {
  addTranscript,
  clearTranscript,
} = require("../../services/call/callTranscript");

const { getExotelCallSid, getExotelPhoneNumber } = require("./exotelClient");

const VALID_OUTCOMES = [
  "normal",
  "callback_requested",
  "demo_visit_confirmed",
  "not_interested",
  "no_response",
];

function createExotelCallManager({
  state,
  url,
  audio,
  client,
  onCustomerActivity,
  onResponseComplete,
  onCallClosureRequested,
}) {
  // Gets the temporary call context.
  function ensureCallContext(data = null) {
    if (!state.callSid) {
      state.callSid = getExotelCallSid(data, url);
    }

    if (state.callSid && !state.callContext) {
      state.callContext = getCallContext(state.callSid);
    }

    if (!state.internalCallId && state.callContext?.callId) {
      state.internalCallId = state.callContext.callId;
    }

    return state.callContext;
  }

  // Loads customer context and creates the Call record.
  async function hydrateCallContext(data = null) {
    ensureCallContext(data);

    if (state.callContext || !state.callSid) {
      return state.callContext;
    }

    if (state.callContextPromise) {
      return state.callContextPromise;
    }

    state.callContextPromise = (async () => {
      try {
        const existingCall = await getCallByExternalSid(state.callSid);

        const phoneNumber =
          existingCall?.phoneNumber || getExotelPhoneNumber(data, url);

        const customerContext = phoneNumber
          ? await getCustomerContext(phoneNumber)
          : {
              customerExists: false,
              customerId: null,
              customerName: null,
              firstName: null,
              previousSummary: null,
              phoneNumber: null,
              doNotCall: false,
            };

        let call = existingCall;

        if (!call) {
          call = await createCall({
            callId: `CALL_${randomUUID()}`,

            externalCallSid: state.callSid,

            customerId: customerContext.customerId,

            phoneNumber: customerContext.phoneNumber || phoneNumber || null,

            direction: "outbound",

            status: "answered",

            startedAt: new Date(),

            answeredAt: new Date(),

            summary: null,

            language: null,

            interestStatus: null,

            callOutcome: null,

            followUpRequired: false,

            followUpDate: null,

            followUpAt: null,

            callbackStatus: null,

            callbackReason: null,

            nextAction: null,

            summaryStatus: "pending",
          });
        }

        state.callContext = {
          callId: call.callId,

          customerId: customerContext.customerId || call.customerId || null,

          customerName: customerContext.customerName || null,

          firstName: customerContext.firstName || null,

          previousSummary: customerContext.previousSummary || null,

          customerExists: Boolean(customerContext.customerExists),

          phoneNumber:
            customerContext.phoneNumber ||
            call.phoneNumber ||
            phoneNumber ||
            null,
        };

        state.internalCallId = state.callContext.callId;

        setCallContext(state.callSid, state.callContext);

        console.log("Call context hydrated from Exotel event:", state.callSid);

        return state.callContext;
      } finally {
        state.callContextPromise = null;
      }
    })();

    return state.callContextPromise;
  }

  // Creates one Voice Agent for the active call.
  async function ensureVoiceAgent(data = null) {
    if (state.callFinalized) {
      return null;
    }

    if (state.voiceAgent) {
      return state.voiceAgent;
    }

    if (state.voiceAgentPromise) {
      return state.voiceAgentPromise;
    }

    state.voiceAgentPromise = (async () => {
      try {
        await hydrateCallContext(data);

        if (
          state.callFinalized ||
          state.finalizingCall ||
          state.callClosureRequested
        ) {
          return null;
        }

        if (!state.callSid || !state.callContext) {
          console.log("Voice Agent creation delayed: call context not ready.");

          return null;
        }

        console.log("");
        console.log("=================================");
        console.log("CREATING VOICE AGENT");
        console.log("=================================");

        console.log("Call SID:", state.callSid);

        console.log("Internal Call ID:", state.callContext.callId);

        console.log("Customer exists:", state.callContext.customerExists);

        console.log("Customer name:", state.callContext.customerName);

        const agent = await createVoiceAgent({
          customerExists: Boolean(state.callContext.customerExists),

          customerName: state.callContext.customerName || null,

          firstName: state.callContext.firstName || null,

          previousSummary: state.callContext.previousSummary || null,

          onAudio: (audioData) => {
            if (state.callFinalized || !state.geminiAudioEnabled) {
              return;
            }

            if (!audioData) {
              return;
            }

            if (state.firstGeminiAudioAt === null) {
              state.firstGeminiAudioAt = Date.now();

              console.log(
                "First Gemini audio after:",
                state.firstGeminiAudioAt - state.callStartedAt,
                "ms",
              );
            }

            audio.queueAudioForExotel(audioData, state.responseGeneration);
          },

          onTranscript: (transcript) => {
            if (state.callFinalized) {
              return;
            }

            addTranscript(state.conversation, transcript);

            if (transcript?.type === "user") {
              onCustomerActivity?.();
            }

            if (transcript?.text) {
              console.log(`Gemini ${transcript.type}: ${transcript.text}`);
            }
          },

          onInterrupted: () => {
            if (state.callFinalized) {
              return;
            }

            state.audioGeneration++;

            state.responseGeneration = state.audioGeneration;

            audio.clearLocalAudio();

            client.clearExotelAudio();
          },

          onResponseStart: () => {
            if (state.callFinalized) {
              return;
            }

            state.responseGeneration = state.audioGeneration;

            console.log(
              "Gemini response started. Generation:",
              state.responseGeneration,
            );
          },

          onResponseComplete: () => {
            if (state.callFinalized) {
              return;
            }

            audio.flushPartialOutputAudio();

            console.log("Gemini response completed.");

            onResponseComplete?.();
          },

          onEndCall: ({ reason } = {}) => {
            if (state.callFinalized || state.finalizingCall) {
              return;
            }

            const validReason = VALID_OUTCOMES.includes(reason)
              ? reason
              : "normal";

            if (validReason === "normal") {
              return;
            }

            state.callOutcome = validReason;

            state.callClosureRequested = true;

            console.log("");
            console.log("=================================");
            console.log("INTENTIONAL CALL CLOSURE REQUESTED");
            console.log("=================================");
            console.log("Outcome:", validReason);

            onCustomerActivity?.();

            onCallClosureRequested?.(validReason);
          },

          onError: (error) => {
            console.error("Voice Agent error:", error);
          },

          onClose: () => {
            console.log("Voice Agent session closed.");

            if (!state.callFinalized) {
              state.voiceAgent = null;
            }
          },
        });

        if (state.callFinalized || state.finalizingCall) {
          agent?.close();

          return null;
        }

        state.voiceAgent = agent;

        console.log("=================================");

        console.log("VOICE AGENT READY");

        console.log("=================================");

        while (state.pendingCustomerAudio.length > 0 && !state.callFinalized) {
          const pendingAudio = state.pendingCustomerAudio.shift();

          if (pendingAudio) {
            state.voiceAgent.sendAudio(pendingAudio);
          }
        }

        return state.voiceAgent;
      } catch (error) {
        console.error("Failed to create Voice Agent:", error);

        state.voiceAgent = null;

        throw error;
      } finally {
        state.voiceAgentPromise = null;
      }
    })();

    return state.voiceAgentPromise;
  }

  // Finalizes the current call.
  async function finalizeCurrentCall(reason) {
    if (state.callFinalized || state.finalizingCall) {
      return;
    }

    state.finalizingCall = true;
    state.callFinalized = true;

    state.geminiAudioEnabled = false;

    try {
      await hydrateCallContext();

      if (!state.internalCallId && !state.callSid) {
        console.log("Cannot finalize call: missing Call ID.");

        return;
      }

      await finalizeCall({
        callId: state.internalCallId,

        externalCallSid: state.callSid,

        phoneNumber: state.callContext?.phoneNumber || null,

        conversation: state.conversation,

        reason: reason || "stop",

        callOutcome:
          state.callOutcome ||
          (reason === "customer_no_response" ? "no_response" : "normal"),
      });
    } catch (error) {
      console.error("Failed to finalize call:", error);
    } finally {
      state.finalizingCall = false;

      clearTranscript(state.conversation);

      audio.clearLocalAudio();

      if (state.callSid) {
        removeCallContext(state.callSid);
      }
    }
  }

  return {
    ensureCallContext,
    hydrateCallContext,
    ensureVoiceAgent,
    finalizeCurrentCall,
  };
}

module.exports = {
  createExotelCallManager,
};
