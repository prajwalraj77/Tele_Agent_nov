//
// ============================================================
// VOICE AGENT ORCHESTRATOR
// ============================================================
// Connects Gemini Live with the Exotel call manager.
// Handles the inbound customer conversation lifecycle.
// ============================================================

const {
  createGeminiLiveSession,
} = require("../services/gemini/geminiLive");

const {
  buildInitialGreeting,
} = require("../services/gemini/geminiPrompts");


async function createVoiceAgent({
  customerExists = false,
  customerName = null,
  firstName = null,
  previousSummary = null,

  onAudio,
  onTranscript,
  onInterrupted,
  onResponseStart,
  onResponseComplete,
  onEndCall,
  onError,
  onClose,
}) {
  let geminiSession = null;
  let closed = false;

  try {
    // ========================================================
    // CREATE GEMINI LIVE SESSION
    // ========================================================

    geminiSession = await createGeminiLiveSession({
      customerExists,
      customerName,
      firstName,
      previousSummary,

      onAudio: (audioData) => {
        if (closed) {
          return;
        }

        onAudio?.(audioData);
      },

      onTranscript: (transcript) => {
        if (closed) {
          return;
        }

        onTranscript?.(transcript);
      },

      onInterrupted: () => {
        if (closed) {
          return;
        }

        onInterrupted?.();
      },

      onResponseStart: () => {
        if (closed) {
          return;
        }

        onResponseStart?.();
      },

      onResponseComplete: () => {
        if (closed) {
          return;
        }

        onResponseComplete?.();
      },

      onEndCall: (data) => {
        if (closed) {
          return;
        }

        onEndCall?.(data);
      },

      onError: (error) => {
        if (closed) {
          return;
        }

        onError?.(error);
      },

      onClose: (event) => {
        onClose?.(event);
      },
    });

    // ========================================================
    // SESSION MAY HAVE BEEN CLOSED DURING INITIALIZATION
    // ========================================================

    if (closed) {
      geminiSession.close();

      throw new Error(
        "Voice Agent closed during initialization.",
      );
    }

    console.log("Voice Agent created successfully.");

    // ========================================================
    // START INBOUND CONVERSATION
    // ========================================================

    const greeting = buildInitialGreeting(
      {
        name:
          firstName ||
          customerName ||
          null,
      },
      previousSummary
        ? [
            {
              type: "previous_summary",
              text: previousSummary,
            },
          ]
        : [],
    );

    // Trigger the initial inbound greeting.
    geminiSession.sendText(greeting);

    // ========================================================
    // RETURN VOICE AGENT INTERFACE
    // ========================================================

    return {
      sendAudio(base64Audio) {
        if (
          closed ||
          !geminiSession ||
          !base64Audio
        ) {
          return;
        }

        geminiSession.sendAudio(base64Audio);
      },

      sendText(text) {
        if (
          closed ||
          !geminiSession ||
          !text
        ) {
          return;
        }

        geminiSession.sendText(text);
      },

      isOpen() {
        return (
          !closed &&
          Boolean(
            geminiSession?.isOpen(),
          )
        );
      },

      close() {
        if (closed) {
          return;
        }

        closed = true;

        if (geminiSession) {
          geminiSession.close();
          geminiSession = null;
        }
      },
    };
  } catch (error) {
    console.error(
      "Failed to create Voice Agent:",
      error,
    );

    if (geminiSession) {
      geminiSession.close();
      geminiSession = null;
    }

    throw error;
  }
}


module.exports = {
  createVoiceAgent,
};