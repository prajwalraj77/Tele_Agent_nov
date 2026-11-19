// ============================================================
// CALL FINALIZER
// ============================================================
// Finalizes calls and persists the Call before profile updates.
// ============================================================

const {
  analyzeCall,
  buildCustomerConversationProfile,
} = require("../callAnalysis");

const {
  getCallById,
  updateCall,
  updateCallByExternalSid,
} = require("../callService");

const {
  findOrCreateCustomerByPhoneNumber,
  updateCustomerAfterCall,
} = require("../customerService");

const Customer =
  require("../../models/Customer");

const VALID_OUTCOMES = [
  "normal",
  "callback_requested",
  "demo_visit_confirmed",
  "not_interested",
  "no_response",
];

// Prevents secondary AI processing from blocking Call persistence.
async function withTimeout(
  promise,
  timeoutMs,
  fallback,
) {
  let timer = null;

  try {
    return await Promise.race([
      promise,

      new Promise((resolve) => {
        timer = setTimeout(() => {
          console.warn(
            `Operation timed out after ${timeoutMs}ms.`,
          );

          resolve(fallback);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

// Finds the Call.
async function resolveCall({
  callId,
  externalCallSid,
}) {
  if (callId) {
    return await getCallById(
      callId,
    );
  }

  if (externalCallSid) {
    const Call =
      require("../../models/Call");

    return await Call.findOne({
      externalCallSid,
    });
  }

  return null;
}

// Updates a Call by ID or Exotel SID.
async function updateExistingCall(
  callId,
  externalCallSid,
  updates,
) {
  if (callId) {
    return await updateCall(
      callId,
      updates,
    );
  }

  if (externalCallSid) {
    return await updateCallByExternalSid(
      externalCallSid,
      updates,
    );
  }

  return null;
}

// Builds callback date in India time.
function buildFollowUpDate(
  callbackDate,
) {
  if (!callbackDate) {
    return null;
  }

  const followUpDate =
    new Date(
      `${callbackDate}T00:00:00+05:30`,
    );

  if (
    Number.isNaN(
      followUpDate.getTime(),
    )
  ) {
    return null;
  }

  return followUpDate;
}

// Builds callback date/time in India time.
function buildFollowUpAt(
  callbackDate,
  callbackTime,
) {
  if (
    !callbackDate ||
    !callbackTime
  ) {
    return null;
  }

  const followUpAt =
    new Date(
      `${callbackDate}T${callbackTime}:00+05:30`,
    );

  if (
    Number.isNaN(
      followUpAt.getTime(),
    )
  ) {
    return null;
  }

  return followUpAt;
}

// Finalizes and persists the call.
async function finalizeCall({
  callId = null,
  externalCallSid = null,
  phoneNumber = null,
  conversation = [],
  reason = "stop",
  callOutcome = null,
}) {
  const endedAt = new Date();

  try {
    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "STARTING CALL FINALIZATION",
    );
    console.log(
      "=================================",
    );

    const call =
      await resolveCall({
        callId,
        externalCallSid,
      });

    if (!call) {
      console.error(
        "Call finalization failed: Call record not found.",
      );

      return null;
    }

    const resolvedPhoneNumber =
      phoneNumber ||
      call.phoneNumber ||
      null;

    const startedAt =
      call.startedAt
        ? new Date(call.startedAt)
        : endedAt;

    const durationSeconds =
      Math.max(
        0,
        Math.round(
          (
            endedAt.getTime() -
            startedAt.getTime()
          ) / 1000,
        ),
      );

    const providedOutcome =
      VALID_OUTCOMES.includes(
        callOutcome,
      )
        ? callOutcome
        : null;

    // Handles calls without a transcript.
    if (
      !Array.isArray(
        conversation,
      ) ||
      conversation.length === 0
    ) {
      const finalOutcome =
        providedOutcome ||
        (
          reason ===
          "customer_no_response"
            ? "no_response"
            : "normal"
        );

      const updates = {
        status:
          reason === "error"
            ? "failed"
            : "completed",

        endedAt,
        durationSeconds,

        summary:
          "No conversation was recorded.",

        interestStatus:
          finalOutcome ===
          "not_interested"
            ? "not_interested"
            : "uncertain",

        callOutcome:
          finalOutcome,

        followUpRequired:
          false,

        followUpDate:
          null,

        followUpAt:
          null,

        callbackStatus:
          null,

        callbackReason:
          null,

        summaryStatus:
          "completed",
      };

      const updatedCall =
        await updateExistingCall(
          callId,
          externalCallSid,
          updates,
        );

      console.log(
        "Call saved without transcript.",
      );

      return updatedCall;
    }

    // Analyze the conversation.
    console.log(
      "Analyzing completed call...",
    );

    const analysis =
      await analyzeCall(
        conversation,
      );

    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "CALL ANALYSIS COMPLETE",
    );
    console.log(
      "=================================",
    );

    console.log(
      "Customer Name:",
      analysis.customerName ||
        "Not detected",
    );

    console.log(
      "Summary:",
      analysis.summary ||
        "No summary",
    );

    console.log(
      "Language:",
      analysis.language ||
        "Unknown",
    );

    console.log(
      "Interest:",
      analysis.interestStatus ||
        "uncertain",
    );

    console.log(
      "Analysis Outcome:",
      analysis.callOutcome ||
        "normal",
    );

    console.log(
      "Callback Date:",
      analysis.callbackDate ||
        "None",
    );

    console.log(
      "Callback Time:",
      analysis.callbackTime ||
        "None",
    );

    console.log(
      "=================================",
    );

    let finalCallOutcome =
      providedOutcome ||
      (
        VALID_OUTCOMES.includes(
          analysis.callOutcome,
        )
          ? analysis.callOutcome
          : "normal"
      );

    if (
      reason ===
      "customer_no_response"
    ) {
      finalCallOutcome =
        "no_response";
    }

    // Normalize special closure outcomes.
    if (
      finalCallOutcome ===
      "not_interested"
    ) {
      analysis.interestStatus =
        "not_interested";

      analysis.followUpRequired =
        false;

      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    // A confirmed demo is NOT a callback.
    if (
      finalCallOutcome ===
      "demo_visit_confirmed"
    ) {
      analysis.followUpRequired =
        false;

      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    // A callback explicitly requested by the customer.
    if (
      finalCallOutcome ===
      "callback_requested"
    ) {
      analysis.followUpRequired =
        true;

      if (!analysis.callbackReason) {
        analysis.callbackReason =
          "Customer requested a callback.";
      }
    }

    // No-response never creates a follow-up.
    if (
      finalCallOutcome ===
      "no_response"
    ) {
      analysis.followUpRequired =
        false;

      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    const explicitlyNotInterested =
      analysis.interestStatus ===
        "not_interested" ||
      finalCallOutcome ===
        "not_interested";

    const followUpRequired =
      finalCallOutcome ===
        "callback_requested"
        ? true
        : !explicitlyNotInterested &&
          finalCallOutcome !==
            "demo_visit_confirmed" &&
          finalCallOutcome !==
            "no_response" &&
          Boolean(
            analysis.followUpRequired,
          );

    const followUpDate =
      followUpRequired
        ? buildFollowUpDate(
            analysis.callbackDate,
          )
        : null;

    const followUpAt =
      followUpRequired
        ? buildFollowUpAt(
            analysis.callbackDate,
            analysis.callbackTime,
          )
        : null;

    // ========================================================
    // SAVE CALL FIRST
    // ========================================================

    const callbackStatus =
      finalCallOutcome ===
        "callback_requested"
        ? "pending"
        : followUpAt &&
          followUpRequired
          ? "pending"
          : null;

    const nextAction =
      finalCallOutcome ===
      "callback_requested"
        ? "Callback requested"
        : finalCallOutcome ===
            "demo_visit_confirmed"
          ? "Demo/showroom visit confirmed"
          : finalCallOutcome ===
              "not_interested"
            ? "Do not contact"
            : finalCallOutcome ===
                "no_response"
              ? "No response"
              : analysis.nextAction ||
                null;

    const callUpdates = {
      status:
        reason === "error"
          ? "failed"
          : "completed",

      endedAt,

      durationSeconds,

      summary:
        analysis.summary ||
        "No summary available.",

      language:
        analysis.language ||
        null,

      interestStatus:
        explicitlyNotInterested
          ? "not_interested"
          : analysis.interestStatus ||
            "uncertain",

      callOutcome:
        finalCallOutcome,

      followUpRequired,

      followUpDate,

      followUpAt,

      callbackStatus,

      callbackReason:
        followUpRequired
          ? analysis.callbackReason ||
            null
          : null,

      nextAction,

      summaryStatus:
        "completed",
    };

    console.log(
      "Saving finalized Call record...",
    );

    const updatedCall =
      await updateExistingCall(
        callId,
        externalCallSid,
        callUpdates,
      );

    if (!updatedCall) {
      throw new Error(
        "Call update returned no document.",
      );
    }

    console.log(
      "CALL RECORD SAVED:",
      updatedCall.callId,
    );

    // ========================================================
    // CUSTOMER UPDATE
    // ========================================================

    let customerId =
      call.customerId ||
      null;

    let customer = null;

    try {
      if (customerId) {
        customer =
          await Customer.findOne({
            customerId,
          });
      }

      if (
        !customerId &&
        resolvedPhoneNumber
      ) {
        const result =
          await findOrCreateCustomerByPhoneNumber({
            phoneNumber:
              resolvedPhoneNumber,

            name:
              analysis.customerName ||
              null,

            source: "call",
          });

        customer =
          result.customer;

        customerId =
          customer.customerId;
      }
    } catch (error) {
      console.error(
        "Customer lookup failed after Call was saved:",
        error,
      );

      return updatedCall;
    }

    if (!customerId) {
      console.log(
        "No customer ID available. Call already saved.",
      );

      return updatedCall;
    }

    let conversationSummary =
      customer?.conversationSummary ||
      customer?.latestSummary ||
      null;

    let conversationRate =
      customer?.conversationRate ??
      null;

    // Generate rolling profile without allowing it to block Call persistence.
    try {
      if (
        analysis.summary
      ) {
        const customerProfile =
          await withTimeout(
            buildCustomerConversationProfile({
              previousSummary:
                conversationSummary,

              previousConversationRate:
                conversationRate,

              currentSummary:
                analysis.summary,

              currentInterestStatus:
                analysis.interestStatus,
            }),

            12000,

            {
              summary:
                analysis.summary,

              conversationRate:
                conversationRate,
            },
          );

        conversationSummary =
          customerProfile.summary ||
          analysis.summary;

        conversationRate =
          customerProfile.conversationRate;
      }
    } catch (error) {
      console.error(
        "Customer profile generation failed. Using fallback:",
        error,
      );

      conversationSummary =
        analysis.summary ||
        conversationSummary;

      conversationRate =
        customer?.conversationRate ??
        null;
    }

    if (
      explicitlyNotInterested
    ) {
      conversationRate = 0;
    }

    // Save customer state separately.
    try {
      await withTimeout(
        updateCustomerAfterCall(
          customerId,

          {
            customerName:
              analysis.customerName,

            ...analysis,

            interestStatus:
              explicitlyNotInterested
                ? "not_interested"
                : analysis.interestStatus,

            followUpRequired,

            callbackReason:
              followUpRequired
                ? analysis.callbackReason
                : null,
          },

          {
            ...(call.toObject?.() ||
              call),

            callId:
              call.callId,

            endedAt,

            followUpDate,

            followUpAt,
          },

          conversationSummary,

          conversationRate,
        ),

        10000,

        null,
      );

      console.log(
        "CUSTOMER RECORD SAVED.",
      );
    } catch (error) {
      console.error(
        "Customer update failed, but Call is already saved:",
        error,
      );
    }

    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "CALL FINALIZED SUCCESSFULLY",
    );
    console.log(
      "=================================",
    );

    console.log(
      "Call ID:",
      updatedCall.callId,
    );

    console.log(
      "Customer ID:",
      customerId ||
        "None",
    );

    console.log(
      "Call Outcome:",
      finalCallOutcome,
    );

    console.log(
      "Interest:",
      explicitlyNotInterested
        ? "not_interested"
        : analysis.interestStatus ||
          "uncertain",
    );

    console.log(
      "Follow-up Required:",
      followUpRequired,
    );

    console.log(
      "Conversation Rate:",
      conversationRate ??
        "Not calculated",
    );

    console.log(
      "=================================",
    );
    console.log("");

    return updatedCall;
  } catch (error) {
    console.error(
      "CALL FINALIZATION FAILED:",
      error,
    );

    throw error;
  }
}

module.exports = {
  finalizeCall,
};