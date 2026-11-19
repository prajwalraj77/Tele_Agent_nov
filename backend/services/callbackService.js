// ============================================================
// CALLBACK SERVICE
// ============================================================
// Finds and updates callback records while respecting the
// customer's permanent Do Not Call state.
// ============================================================

const Call = require("../models/Call");
const Customer = require("../models/Customer");

// Finds callbacks that are due and are still callable.
async function findDueCallbacks() {
  const now = new Date();

  const calls =
    await Call.find({
      followUpRequired: true,

      callbackStatus: "pending",

      interestStatus: {
        $ne: "not_interested",
      },

      followUpAt: {
        $lte: now,
      },
    }).lean();

  if (calls.length === 0) {
    return [];
  }

  const customerIds =
    [
      ...new Set(
        calls
          .map(
            (call) =>
              call.customerId,
          )
          .filter(Boolean),
      ),
    ];

  if (customerIds.length === 0) {
    return calls;
  }

  const blockedCustomerIds =
    await Customer.find({
      customerId: {
        $in: customerIds,
      },

      doNotCall: true,
    }).distinct("customerId");

  const blockedSet =
    new Set(
      blockedCustomerIds,
    );

  return calls.filter(
    (call) =>
      !blockedSet.has(
        call.customerId,
      ),
  );
}

// Marks one callback as processing.
async function markCallbackProcessing(
  callId,
) {
  const call =
    await Call.findOne({
      callId,

      callbackStatus:
        "pending",
    });

  if (!call) {
    return null;
  }

  if (
    call.interestStatus ===
    "not_interested"
  ) {
    return null;
  }

  if (call.customerId) {
    const customer =
      await Customer.findOne({
        customerId:
          call.customerId,
      }).lean();

    if (
      customer?.doNotCall === true
    ) {
      return null;
    }
  }

  return await Call.findOneAndUpdate(
    {
      callId,

      callbackStatus:
        "pending",
    },

    {
      callbackStatus:
        "processing",
    },

    {
      new: true,
    },
  );
}

// Marks a callback as completed.
async function markCallbackCompleted(
  callId,
) {
  return await Call.findOneAndUpdate(
    {
      callId,
    },

    {
      callbackStatus:
        "completed",
    },

    {
      new: true,
    },
  );
}

module.exports = {
  findDueCallbacks,
  markCallbackProcessing,
  markCallbackCompleted,
};