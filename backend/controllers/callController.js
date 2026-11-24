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

// Bulk call service
const {
  parseAndNormalizeNumbers,
  createBulkCall,
  getBulkCall,
  listBulkCalls,
  pauseBulkCall,
  resumeBulkCall,
  cancelBulkCall,
} = require("../services/call/bulkCallService");

// Bulk call processor (for active status)
const {
  getActiveBulkStatus,
} = require("../services/call/bulkCallProcessor");

const {
  waitForCallCompletion,
  startBulkCallInBackground,
} = require("../services/call/bulkCallProcessor");

const {
  getCallsByBulkId,
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

        latestSummary:
          customerContext.previousSummary,

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

// Initiates a bulk call campaign
async function initiateBulkCall(req, res) {
  try {
    const { name, phoneNumbers, config } = req.body;

    if (!phoneNumbers || typeof phoneNumbers !== "string") {
      return res.status(400).json({
        success: false,
        message: "Phone numbers are required (paste multiple numbers separated by newlines, commas, or semicolons)",
      });
    }

    const { numbers, errors } = parseAndNormalizeNumbers(phoneNumbers);

    if (numbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid phone numbers found",
        errors,
      });
    }

    const bulkCall = await createBulkCall({
      name: name || "Bulk Dial Campaign",
      phoneNumbers: numbers,
      config,
    });

    startBulkCallInBackground(bulkCall.bulkId);

    return res.json({
      success: true,
      bulkId: bulkCall.bulkId,
      status: "started",
      totalNumbers: bulkCall.totalNumbers,
      validNumbers: numbers.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Bulk dial campaign started with ${numbers.length} numbers`,
    });
  } catch (error) {
    console.error("Bulk call initiation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate bulk call",
      error: error.message,
    });
  }
}

// Get bulk call status
async function getBulkCallStatus(req, res) {
  try {
    const { bulkId } = req.params;

    const bulkCall = await getBulkCall(bulkId);
    if (!bulkCall) {
      return res.status(404).json({
        success: false,
        message: "Bulk call not found",
      });
    }

    const activeStatus = getActiveBulkStatus(bulkId);

    return res.json({
      success: true,
      bulkCall: {
        ...bulkCall,
        active: activeStatus,
      },
    });
  } catch (error) {
    console.error("Failed to get bulk call status:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// List all bulk calls
async function listBulkCallsHandler(req, res) {
  try {
    const limit = Number(req.query.limit) || 50;
    const bulkCalls = await listBulkCalls(limit);

    return res.json({
      success: true,
      bulkCalls,
    });
  } catch (error) {
    console.error("Failed to list bulk calls:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Pause bulk call
async function pauseBulkCallHandler(req, res) {
  try {
    const { bulkId } = req.params;
    const paused = pauseBulkCall(bulkId);

    if (!paused) {
      return res.status(404).json({
        success: false,
        message: "Bulk call not found or not running",
      });
    }

    return res.json({
      success: true,
      message: "Bulk call paused",
    });
  } catch (error) {
    console.error("Failed to pause bulk call:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Resume bulk call
async function resumeBulkCallHandler(req, res) {
  try {
    const { bulkId } = req.params;
    const resumed = resumeBulkCall(bulkId);

    if (!resumed) {
      return res.status(404).json({
        success: false,
        message: "Bulk call not found or not running",
      });
    }

    return res.json({
      success: true,
      message: "Bulk call resumed",
    });
  } catch (error) {
    console.error("Failed to resume bulk call:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Cancel bulk call
async function cancelBulkCallHandler(req, res) {
  try {
    const { bulkId } = req.params;
    const cancelled = cancelBulkCall(bulkId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: "Bulk call not found or not running",
      });
    }

    return res.json({
      success: true,
      message: "Bulk call cancelled",
    });
  } catch (error) {
    console.error("Failed to cancel bulk call:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// Get calls for a bulk campaign
async function getBulkCallCalls(req, res) {
  try {
    const { bulkId } = req.params;
    const calls = await getCallsByBulkId(bulkId);

    return res.json({
      success: true,
      calls,
    });
  } catch (error) {
    console.error("Failed to get bulk call calls:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
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
  initiateBulkCall,
  getBulkCallStatus,
  listBulkCalls: listBulkCallsHandler,
  pauseBulkCall: pauseBulkCallHandler,
  resumeBulkCall: resumeBulkCallHandler,
  cancelBulkCall: cancelBulkCallHandler,
  getBulkCallCalls,
  getCalls,
  getPendingFollowUps,
  waitForCallCompletion,
};
