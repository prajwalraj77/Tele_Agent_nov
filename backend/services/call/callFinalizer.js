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

// Prevent secondary AI processing from blocking Call persistence.
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
        timer =
          setTimeout(() => {
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

// ============================================================
// FINALIZE CALL
// ============================================================

async function finalizeCall({
  callId = null,
  externalCallSid = null,
  phoneNumber = null,
  conversation = [],
  reason = "stop",
  callOutcome = null,
}) {
  const endedAt =
    new Date();

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

    // ========================================================
    // 1. FIND EXISTING CALL
    // ========================================================

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
        ? new Date(
            call.startedAt,
          )
        : endedAt;

    const durationSeconds =
      Math.max(
        0,
        Math.round(
          (
            endedAt.getTime() -
            startedAt.getTime()
          ) /
            1000,
        ),
      );

    // ========================================================
    // IMPORTANT
    // ========================================================
    // "normal" is a valid outcome, but it is NOT a meaningful
    // explicit customer instruction.
    //
    // Therefore, only non-normal voice outcomes are allowed
    // to override Gemini's analysis.
    // ========================================================

    const rawProvidedOutcome =
      VALID_OUTCOMES.includes(
        callOutcome,
      )
        ? callOutcome
        : null;

    const meaningfulProvidedOutcome =
      rawProvidedOutcome &&
      rawProvidedOutcome !==
        "normal"
        ? rawProvidedOutcome
        : null;

    // ========================================================
    // 2. SAVE BASIC COMPLETION DATA FIRST
    // ========================================================

    let updatedCall =
      await updateExistingCall(
        callId,
        externalCallSid,
        {
          status:
            meaningfulProvidedOutcome ===
            "no_response"
              ? "no_answer"
              : "completed",

          endedAt,

          durationSeconds,

          summaryStatus:
            Array.isArray(
              conversation,
            ) &&
            conversation.length >
              0
              ? "pending"
              : "completed",

          ...(meaningfulProvidedOutcome
            ? {
                callOutcome:
                  meaningfulProvidedOutcome,
              }
            : {}),
        },
      );

    if (!updatedCall) {
      console.error(
        "Call finalization failed: Call could not be updated.",
      );

      return null;
    }

    console.log(
      "CALL BASIC COMPLETION DATA SAVED:",
      updatedCall.callId,
    );

    // ========================================================
    // 3. NO TRANSCRIPT
    // ========================================================

    if (
      !Array.isArray(
        conversation,
      ) ||
      conversation.length ===
        0
    ) {
      updatedCall =
        await updateExistingCall(
          callId,
          externalCallSid,
          {
            summaryStatus:
              "completed",
          },
        );

      console.log(
        "Call saved without transcript - analysis marked completed.",
      );

      await updateCustomerAfterFinalization(
        call,
        resolvedPhoneNumber,
        updatedCall,
        endedAt,
        null,
        null,
        false,
        null,
        "uncertain",
        null,
      );

      return updatedCall;
    }

    // ========================================================
    // 4. AI ANALYSIS
    // ========================================================

    let analysis =
      null;

    let analysisError =
      null;

    try {
      console.log(
        "Analyzing completed call...",
      );

      analysis =
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
    } catch (
      analysisErr
    ) {
      analysisError =
        analysisErr;

      console.error(
        "Call analysis failed:",
        analysisErr.message,
      );
    }

    // ========================================================
    // 5. ANALYSIS SUCCESS
    // ========================================================

    if (
      analysis &&
      !analysisError
    ) {
      let finalOutcome =
        meaningfulProvidedOutcome ||
        (
          VALID_OUTCOMES.includes(
            analysis.callOutcome,
          )
            ? analysis.callOutcome
            : "normal"
        );

      // Explicit no-response reason
      // from the voice layer remains authoritative.
      if (
        reason ===
        "customer_no_response"
      ) {
        finalOutcome =
          "no_response";
      }

      // ======================================================
      // NOT INTERESTED
      // ======================================================

      if (
        finalOutcome ===
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

      // ======================================================
      // DEMO / VISIT
      // ======================================================

      if (
        finalOutcome ===
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

      // ======================================================
      // CALLBACK
      // ======================================================

      if (
        finalOutcome ===
        "callback_requested"
      ) {
        analysis.followUpRequired =
          true;

        if (
          !analysis.callbackReason
        ) {
          analysis.callbackReason =
            "Customer requested a callback.";
        }
      }

      // ======================================================
      // NO RESPONSE
      // ======================================================

      if (
        finalOutcome ===
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
        finalOutcome ===
          "not_interested";

      const followUpRequired =
        finalOutcome ===
        "callback_requested"
          ? true
          : !explicitlyNotInterested &&
            finalOutcome !==
              "demo_visit_confirmed" &&
            finalOutcome !==
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

      const callbackStatus =
        finalOutcome ===
        "callback_requested"
          ? "pending"
          : followUpAt &&
            followUpRequired
            ? "pending"
            : null;

      const nextAction =
        finalOutcome ===
        "callback_requested"
          ? "Callback requested"
          : finalOutcome ===
              "demo_visit_confirmed"
            ? "Demo/showroom visit confirmed"
            : finalOutcome ===
                "not_interested"
              ? "Do not contact"
              : finalOutcome ===
                  "no_response"
                ? "No response"
                : analysis.nextAction ||
                  null;

      const analysisUpdates =
        {
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
            finalOutcome,

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

          status:
            finalOutcome === "no_response"
              ? "no_answer"
              : "completed",

          summaryStatus:
            "completed",
        };

      // ======================================================
      // SAVE ANALYSIS
      // ======================================================

      updatedCall =
        await updateExistingCall(
          callId,
          externalCallSid,
          analysisUpdates,
        );

      if (!updatedCall) {
        throw new Error(
          "Call analysis completed, but the Call record could not be updated.",
        );
      }

      console.log(
        "CALL RECORD UPDATED WITH ANALYSIS:",
        updatedCall.callId,
      );

      // ======================================================
      // UPDATE CUSTOMER
      // ======================================================

      await updateCustomerAfterFinalization(
        call,
        resolvedPhoneNumber,
        updatedCall,
        endedAt,
        analysis,
        analysis.summary,
        followUpRequired,
        analysis.callbackReason,
        analysis.interestStatus,
        analysis.customerName,
      );

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
        updatedCall.customerId ||
          call.customerId ||
          "None",
      );

      console.log(
        "Call Outcome:",
        finalOutcome,
      );

      console.log(
        "Interest:",
        analysis.interestStatus ||
          "uncertain",
      );

      console.log(
        "Follow-up Required:",
        followUpRequired,
      );

      console.log(
        "Conversation Rate:",
        "Not calculated",
      );

      console.log(
        "=================================",
      );
      console.log("");

      return updatedCall;
    }

    // ========================================================
    // 6. ANALYSIS FAILED
    // ========================================================

    updatedCall =
      await updateExistingCall(
        callId,
        externalCallSid,
        {
          summaryStatus:
            "failed",

          status:
            meaningfulProvidedOutcome ===
            "no_response"
              ? "no_answer"
              : "completed",

          summary:
            "AI analysis unavailable: " +
            (
              analysisError?.message ||
              "Unknown error"
            ),

          callOutcome:
            meaningfulProvidedOutcome ||
            call.callOutcome ||
            "normal",
        },
      );

    if (!updatedCall) {
      console.error(
        "Call was completed, but final analysis-status update failed.",
      );

      return call;
    }

    console.log(
      "CALL RECORD SAVED (analysis failed):",
      updatedCall.callId,
    );

    await updateCustomerAfterFinalization(
      call,
      resolvedPhoneNumber,
      updatedCall,
      endedAt,
      null,
      null,
      false,
      null,
      "uncertain",
      null,
    );

    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "CALL FINALIZED (analysis skipped)",
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
      updatedCall.customerId ||
        call.customerId ||
        "None",
    );

    console.log(
      "Call Outcome:",
      meaningfulProvidedOutcome ||
        call.callOutcome ||
        "normal",
    );

    console.log(
      "Interest:",
      "uncertain",
    );

    console.log(
      "Follow-up Required:",
      false,
    );

    console.log(
      "Conversation Rate:",
      "Not calculated",
    );

    console.log(
      "=================================",
    );
    console.log("");

    return updatedCall;
  } catch (
    error
  ) {
    console.error(
      "CALL FINALIZATION FAILED:",
      error,
    );

    throw error;
  }
}

// ============================================================
// CUSTOMER UPDATE
// ============================================================

async function updateCustomerAfterFinalization(
  call,
  resolvedPhoneNumber,
  updatedCall,
  endedAt,
  analysis,
  summary,
  followUpRequired,
  callbackReason,
  interestStatus,
  customerName,
) {
  let customerId =
    call.customerId ||
    updatedCall?.customerId ||
    null;

  let customer =
    null;

  try {
    if (
      customerId
    ) {
      customer =
        await Customer.findOne(
          {
            customerId,
          },
        );
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
            customerName ||
            null,

          source:
            "call",
        });

      customer =
        result.customer;

      customerId =
        customer.customerId;

      // Update the Call document with the customerId so future queries can find it
      if (customerId) {
        await updateExistingCall(
          call.callId,
          call.externalCallSid,
          { customerId },
        );
        // Also update the local object that will be returned
        if (updatedCall) {
          updatedCall.customerId = customerId;
        }
      }
    }
  } catch (
    error
  ) {
    console.error(
      "Customer lookup failed after Call was saved:",
      error,
    );

    return updatedCall;
  }

  if (
    !customerId
  ) {
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

  // ========================================================
  // CUSTOMER PROFILE
  // ========================================================

  if (
    analysis &&
    analysis.summary
  ) {
    try {
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

          30000,

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
    } catch (
      error
    ) {
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
  }

  const explicitlyNotInterested =
    interestStatus ===
    "not_interested";

  if (
    explicitlyNotInterested
  ) {
    conversationRate =
      0;
  }

  // ========================================================
  // SAVE CUSTOMER
  // ========================================================

  try {
    await withTimeout(
      updateCustomerAfterCall(
        customerId,

        {
          customerName:
            analysis?.customerName ||
            null,

          ...(analysis ||
            {}),

          interestStatus:
            explicitlyNotInterested
              ? "not_interested"
              : interestStatus ||
                "uncertain",

          followUpRequired,

          callbackReason:
            followUpRequired
              ? callbackReason
              : null,
        },

        {
          ...(call.toObject?.() ||
            call),

          callId:
            updatedCall?.callId ||
            call.callId,

          customerId,

          endedAt,

          followUpDate:
            followUpRequired &&
            analysis?.callbackDate
              ? buildFollowUpDate(
                  analysis.callbackDate,
                )
              : null,

          followUpAt:
            followUpRequired &&
            analysis?.callbackDate &&
            analysis?.callbackTime
              ? buildFollowUpAt(
                  analysis.callbackDate,
                  analysis.callbackTime,
                )
              : null,
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
  } catch (
    error
  ) {
    console.error(
      "Customer update failed, but Call is already saved:",
      error,
    );
  }

  return updatedCall;
}

module.exports = {
  finalizeCall,
  updateCustomerAfterFinalization,
};