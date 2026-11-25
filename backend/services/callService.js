const Call = require("../models/Call");

// Creates the Call document when a call starts.
async function createCall({
  callId,
  externalCallSid = null,
  customerId = null,
  phoneNumber = null,
  direction = "outbound",
  status = "initiated",
  startedAt = null,
  answeredAt = null,
  endedAt = null,
  durationSeconds = 0,
  summary = null,
  language = null,
  interestStatus = null,
  callOutcome = null,
  followUpRequired = false,
  followUpDate = null,
  followUpAt = null,
  callbackStatus = null,
  callbackReason = null,
  nextAction = null,
  summaryStatus = "pending",
}) {
  return await Call.create({
    callId,
    externalCallSid,
    customerId,
    phoneNumber,
    direction,
    status,
    startedAt: startedAt || new Date(),
    answeredAt,
    endedAt,
    durationSeconds,
    summary,
    language,
    interestStatus,
    callOutcome,
    followUpRequired,
    followUpDate,
    followUpAt,
    callbackStatus,
    callbackReason,
    nextAction,
    summaryStatus,
  });
}

// Updates a Call by internal ID.
async function updateCall(
  callId,
  updates,
) {
  return await Call.findOneAndUpdate(
    { callId },
    { $set: updates },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );
}

// Gets a Call by internal ID.
async function getCallById(callId) {
  return await Call.findOne({
    callId,
  });
}

// Gets a Call by Exotel SID.
async function getCallByExternalSid(
  externalCallSid,
) {
  if (!externalCallSid) {
    return null;
  }

  return await Call.findOne({
    externalCallSid,
  });
}

// Updates a Call by Exotel SID.
async function updateCallByExternalSid(
  externalCallSid,
  updates,
) {
  return await Call.findOneAndUpdate(
    { externalCallSid },
    { $set: updates },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );
}

// Lists recent calls.
async function listRecentCalls(
  limit = 50,
) {
  return await Call.find({})
    .sort({ createdAt: -1 })
    .limit(limit);
}

// Lists callbacks that have an exact scheduled time.
async function listPendingFollowUps(
  limit = 50,
) {
  return await Call.find({
    followUpRequired: true,
    callbackStatus: "pending",
    followUpAt: { $ne: null },
  })
    .sort({ followUpAt: 1 })
    .limit(limit);
}

// Gets all calls for a specific customer, sorted newest first.
async function getCallsByCustomerId(
  customerId,
) {
  // First try to find by customerId
  let calls = await Call.find({ customerId })
    .sort({ createdAt: -1 });
  
  // If no calls found, try to find by phoneNumber
  // This handles cases where customerId wasn't set on the call record
  if (calls.length === 0) {
    const Customer = require("../models/Customer");
    const customer = await Customer.findOne({ customerId });
    if (customer && customer.phoneNumber) {
      calls = await Call.find({ phoneNumber: customer.phoneNumber })
        .sort({ createdAt: -1 });
    }
  }
  
  return calls;
}

// Gets all calls for a specific bulk campaign, sorted newest first.
async function getCallsByBulkId(bulkId) {
  return await Call.find({ bulkId })
    .sort({ createdAt: -1 });
}

module.exports = {
  createCall,
  updateCall,
  updateCallByExternalSid,
  getCallById,
  getCallByExternalSid,
  listRecentCalls,
  listPendingFollowUps,
  getCallsByCustomerId,
  getCallsByBulkId,
};