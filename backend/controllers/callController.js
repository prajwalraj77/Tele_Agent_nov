// ============================================================
// CALL CONTROLLER
// ============================================================
// Handles API requests related to phone calls.
// ============================================================

const { randomUUID } = require("crypto");

// Gets customer details and conversation context.
const {
  getCustomerContext,
} = require("../services/customer/customerContext");

// Starts an outbound phone call.
const {
  initiateExotelFlowCall,
} = require("../transports/exotel/exotelCallService");

// Handles Call MongoDB records.
const {
  createCall,
  updateCall,
  listPendingFollowUps,
  listRecentCalls,
} = require("../services/callService");

// Initiates an outbound call.
async function initiateCall(req, res) {
  let call = null;

  try {
    const { phoneNumber } =
      req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required",
      });
    }

    const customerContext =
      await getCustomerContext(
        phoneNumber,
      );

    console.log(
      "Call customer exists:",
      customerContext.customerExists,
    );

    // Permanently block customers who explicitly said
    // they are not interested.
    if (customerContext.doNotCall) {
      return res.status(409).json({
        success: false,
        code: "DO_NOT_CALL",
        message:
          "This customer is marked as Do Not Call because they previously indicated they are not interested.",
      });
    }

    const callId =
      `CALL_${randomUUID()}`;

    call = await createCall({
      callId,

      customerId:
        customerContext.customerId,

      phoneNumber:
        customerContext.phoneNumber ||
        phoneNumber,

      direction:
        "outbound",

      status:
        "created",

      startedAt:
        new Date(),

      summary:
        null,

      language:
        null,

      interestStatus:
        null,

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

      nextAction:
        null,

      summaryStatus:
        "pending",
    });

    console.log(
      "Call record created:",
      call.callId,
    );

    const result =
      await initiateExotelFlowCall({
        phoneNumber,

        callId:
          call.callId,

        customerId:
          customerContext.customerId,

        customerName:
          customerContext.customerName,

        firstName:
          customerContext.firstName,

        previousSummary:
          customerContext.previousSummary,

        customerExists:
          customerContext.customerExists,
      });

    const updatedCall =
      await updateCall(
        call.callId,
        {
          externalCallSid:
            result.callSid,

          status:
            "initiated",
        },
      );

    console.log(
      "Call updated with Exotel SID:",
      result.callSid,
    );

    return res.json({
      success: true,

      callId:
        updatedCall.callId,

      callSid:
        result.callSid,

      customer: {
        customerId:
          customerContext.customerId,

        name:
          customerContext.customerName,

        phoneNumber:
          customerContext.phoneNumber ||
          phoneNumber,

        // Kept for current frontend compatibility.
        latestSummary:
          customerContext.previousSummary,

        // New preferred field.
        conversationSummary:
          customerContext.previousSummary,

        interestStatus:
          customerContext.interestStatus,

        doNotCall:
          customerContext.doNotCall,
      },

      customerExists:
        customerContext.customerExists,

      message:
        customerContext.customerExists
          ? "Call initiated for existing customer."
          : "Call initiated for new customer.",
    });
  } catch (error) {
    console.error(
      "Exotel outbound call failed:",
      error.response?.data ||
        error.message,
    );

    if (call?.callId) {
      await updateCall(
        call.callId,
        {
          status:
            "failed",

          endedAt:
            new Date(),

          summaryStatus:
            "failed",
        },
      ).catch((updateError) => {
        console.error(
          "Failed to mark call as failed:",
          updateError,
        );
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Failed to initiate Exotel call",

      error:
        error.response?.data ||
        error.message,
    });
  }
}

// Returns recent calls.
async function getCalls(req, res) {
  try {
    const limit =
      Number(req.query.limit) ||
      50;

    const calls =
      await listRecentCalls(limit);

    return res.json({
      success: true,
      calls,
    });
  } catch (error) {
    console.error(
      "Failed to list calls:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Returns pending follow-ups.
async function getPendingFollowUps(
  req,
  res,
) {
  try {
    const limit =
      Number(req.query.limit) ||
      50;

    const calls =
      await listPendingFollowUps(limit);

    return res.json({
      success: true,
      followUps: calls,
    });
  } catch (error) {
    console.error(
      "Failed to list pending follow-ups:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  initiateCall,
  getCalls,
  getPendingFollowUps,
};