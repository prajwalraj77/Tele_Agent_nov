// ============================================================
// BULK CALL FINALIZER
// ============================================================
// Post-call processing for bulk calls.
// Reuses existing voice agent and customer services.
// ============================================================

const { analyzeCall } = require("../callAnalysis");
const { updateCustomerAfterCall } = require("../customerService");

// Finalize a bulk call after conversation ends.
async function finalizeBulkCallConversation({
  bulkCallId,
  bulkRecipientId,
  bulkAttemptId,
  customerId,
  phoneNumber,
  normalizedPhoneNumber,
  conversation,
  reason = "stop",
  callOutcome = null,
}) {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 5000); // approximate
  const durationSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));

  // Attempt AI analysis (non-blocking)
  let analysis = null;
  let analysisStatus = "completed";
  let analysisError = null;

  if (conversation && conversation.length > 0) {
    try {
      analysis = await analyzeCall(conversation);
    } catch (error) {
      analysisStatus = "failed";
      analysisError = error.message;
      console.error(`Bulk call analysis failed for ${normalizedPhoneNumber}:`, error.message);
    }
  }

  // Build analysis-derived fields
  let finalOutcome = callOutcome || "normal";
  let interestStatus = "uncertain";
  let followUpRequired = false;
  let followUpDate = null;
  let followUpAt = null;
  let callbackReason = null;
  let nextAction = null;
  let summary = "No conversation was recorded.";
  let language = null;

  if (analysis && analysisStatus === "completed") {
    summary = analysis.summary || summary;
    language = analysis.language || language;
    interestStatus = analysis.interestStatus || interestStatus;
    finalOutcome = analysis.callOutcome || finalOutcome;
    followUpRequired = analysis.followUpRequired || false;
    callbackReason = analysis.callbackReason || null;
    nextAction = analysis.nextAction || null;

    if (analysis.callbackDate && analysis.callbackTime) {
      const [hours, minutes] = analysis.callbackTime.split(":").map(Number);
      followUpDate = new Date(`${analysis.callbackDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`);
      followUpAt = followUpDate;
    } else if (analysis.callbackDate) {
      followUpDate = new Date(`${analysis.callbackDate}T00:00:00+05:30`);
      followUpAt = followUpDate;
    }
  } else if (analysisStatus === "failed") {
    summary = `AI analysis unavailable: ${analysisError || "Unknown error"}`;
  }

  // Normalize special outcomes
  if (finalOutcome === "not_interested") {
    interestStatus = "not_interested";
    followUpRequired = false;
  }
  if (finalOutcome === "callback_requested") {
    followUpRequired = true;
  }
  if (finalOutcome === "no_response") {
    followUpRequired = false;
  }

  // Update Customer (reuses existing customer service)
  if (customerId) {
    try {
      await updateCustomerAfterCall(customerId, {
        customerName: analysis?.customerName || null,
        interestStatus,
        followUpRequired,
        callbackReason,
      }, {
        callId: `CALL_${bulkAttemptId.slice(-8)}`,
        endedAt,
        followUpDate,
        followUpAt,
      });
    } catch (error) {
      console.error(`Bulk call customer update failed for ${customerId}:`, error.message);
    }
  }

  console.log(`Bulk call conversation finalized: ${normalizedPhoneNumber}`);
}

module.exports = {
  finalizeBulkCallConversation,
};