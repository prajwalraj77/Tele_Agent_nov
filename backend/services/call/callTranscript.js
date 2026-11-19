// ============================================================
// TEMPORARY CALL TRANSCRIPT
// ============================================================
// Temporarily stores the conversation between the customer and AI
// while the call is active. The transcript is cleared after the call.
// ============================================================

// Creates an empty transcript for a new call.
function createTranscript() {
  return [];
}

// Adds a customer or AI message to the transcript.
function addTranscript(conversation, transcript) {
  if (!Array.isArray(conversation)) {
    return;
  }

  if (!transcript) {
    return;
  }

  if (!transcript.text) {
    return;
  }

  conversation.push({
    type: transcript.type === "user" ? "user" : "assistant",

    text: String(transcript.text).trim(),
  });
}

// Clears the temporary transcript when the call is finished.
function clearTranscript(conversation) {
  if (!Array.isArray(conversation)) {
    return;
  }

  conversation.length = 0;
}

module.exports = {
  createTranscript,
  addTranscript,
  clearTranscript,
};
