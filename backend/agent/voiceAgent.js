// ============================================================
// VOICE AGENT ORCHESTRATOR
// ============================================================
// Connects Gemini Live with the Exotel call manager.
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

    if (closed) {
      geminiSession.close();

      throw new Error(
        "Voice Agent closed during initialization.",
      );
    }

    console.log("Voice Agent created successfully.");

    const greeting = buildInitialGreeting({
      customerExists,
      firstName,
      previousSummary,
    });

    geminiSession.sendText(greeting);

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
          Boolean(geminiSession?.isOpen())
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