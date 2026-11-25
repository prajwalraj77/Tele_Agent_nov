// ============================================================
// BULK CALL RUNNER
// ============================================================
const BulkCall = require("../../models/BulkCall");
const BulkCallRecipient = require("../../models/BulkCallRecipient");
const BulkCallAttempt = require("../../models/BulkCallAttempt");
const { normalizePhoneNumberForExotel } = require("../phoneNormalizer");
const { initiateExotelFlowCall } = require("../../transports/exotel/exotelCallService");
const { findCustomerByPhone } = require("../customer/customerContext");

const campaignQueues = new Map();
const campaignStatus = new Map();
const DEFAULT_CONCURRENCY = 3;

function initQueue(bulkId, concurrency = DEFAULT_CONCURRENCY) {
  campaignQueues.set(bulkId, {
    bulkId,
    concurrency,
    running: 0,
    paused: false,
    cancelled: false,
    completed: false,
  });
  campaignStatus.set(bulkId, { running: false, paused: false });
}

function getQueue(bulkId) {
  if (!campaignQueues.has(bulkId)) {
    initQueue(bulkId);
  }
  return campaignQueues.get(bulkId);
}

async function processNext(bulkId) {
  const queue = getQueue(bulkId);
  if (queue.completed || queue.cancelled || queue.paused) return;
  if (queue.running >= queue.concurrency) return;

  const recipient = await BulkCallRecipient.findOne({
    bulkCallId: bulkId,
    status: "pending",
  }).sort({ createdAt: 1 });

  if (!recipient) {
    const all = await BulkCallRecipient.countDocuments({ bulkCallId: bulkId });
    const done = await BulkCallRecipient.countDocuments({
      bulkCallId: bulkId,
      status: { $in: ["completed", "failed", "no_answer", "busy", "invalid", "cancelled"] },
    });
    if (all > 0 && all === done) {
      queue.completed = true;
      await markCampaignCompleted(bulkId);
    }
    return;
  }

  queue.running += 1;
  await processRecipient(bulkId, recipient, queue);
  queue.running -= 1;
  setImmediate(() => processNext(bulkId));
}

async function processRecipient(bulkId, recipient, queue) {
  const normalized = recipient.normalizedPhoneNumber;
  const exotelNumber = normalizePhoneNumberForExotel(normalized);
  if (!exotelNumber) {
    await markRecipientFailed(bulkId, recipient._id, "Invalid phone number");
    return;
  }

  await BulkCallRecipient.findOneAndUpdate(
    { _id: recipient._id },
    { $set: { status: "calling", lastAttemptAt: new Date(), attemptCount: (recipient.attemptCount || 0) + 1 } },
  );

  const attemptNumber = (recipient.attemptCount || 0) + 1;
  const attemptId = `BULK_ATTEMPT_${recipient._id}_${attemptNumber}`;

  await BulkCallAttempt.create({
    bulkAttemptId: attemptId,
    bulkCallId: bulkId,
    bulkRecipientId: recipient._id,
    customerId: recipient.customerId || null,
    attemptNumber,
    phoneNumber: recipient.phoneNumber,
    normalizedPhoneNumber: normalized,
    status: "calling",
    startedAt: new Date(),
  });

  try {
    let customerId = recipient.customerId;
    if (!customerId) {
      const customer = await findCustomerByPhone(normalized);
      if (customer) {
        customerId = customer.customerId;
        await BulkCallRecipient.findOneAndUpdate({ _id: recipient._id }, { $set: { customerId } });
      }
    }

    const result = await initiateExotelFlowCall({
      phoneNumber: normalized,
      callId: `CALL_${recipient._id}_${Date.now()}`,
      customerId,
      customerName: recipient.name || null,
      firstName: recipient.name ? recipient.name.split(" ")[0] : null,
      previousSummary: null,
    });

    const callSid = result.callSid;

    await BulkCallRecipient.findOneAndUpdate(
      { _id: recipient._id },
      { $set: { status: "answered", exotelCallSid: callSid, callId: `CALL_${recipient._id}_${Date.now()}` } },
    );

    await BulkCallAttempt.findOneAndUpdate(
      { bulkAttemptId: attemptId },
      { $set: { status: "answered", exotelCallSid: callSid, answeredAt: new Date() } },
    );

    await waitForCallCompletion(callSid, 30000);

    const Call = require("../../models/Call");
    const finalCall = await Call.findOne({ externalCallSid: callSid }).lean();

    if (finalCall) {
      await markRecipientCompleted(
        bulkId,
        recipient._id,
        finalCall.status || "completed",
        finalCall.durationSeconds || 0,
        finalCall.callOutcome || "normal",
        finalCall.summary || null,
        finalCall.interestStatus || "uncertain",
        finalCall.followUpRequired || false,
        finalCall.followUpAt || null,
        finalCall.callbackReason || null,
        finalCall.nextAction || null,
      );
    } else {
      await markRecipientCompleted(
        bulkId,
        recipient._id,
        "no_answer",
        0,
        "no_response",
        null,
        "uncertain",
        false,
        null,
        null,
        null,
      );
    }
  } catch (error) {
    console.error(`Bulk call failed for ${normalized}:`, error.message);
    await markRecipientFailed(bulkId, recipient._id, error.message);
  }
}

async function waitForCallCompletion(callSid, timeoutMs) {
  const startTime = Date.now();
  const pollInterval = 2000;

  return new Promise((resolve) => {
    const check = async () => {
      if (Date.now() - startTime > timeoutMs) {
        resolve({ status: "timeout" });
        return;
      }
      try {
        const Call = require("../../models/Call");
        const call = await Call.findOne({ externalCallSid: callSid }).lean();
        if (call && (call.status === "completed" || call.status === "failed")) {
          resolve(call);
          return;
        }
      } catch (e) {}
      setTimeout(check, pollInterval);
    };
    check();
  });
}

async function getCallByExternalSid(callSid) {
  const Call = require("../../models/Call");
  return await Call.findOne({ externalCallSid: callSid }).lean();
}

async function markRecipientCompleted(
  bulkId, recipientId, status, durationSeconds, callOutcome,
  summary, interestStatus, followUpRequired, followUpAt, callbackReason, nextAction
) {
  await BulkCallRecipient.findOneAndUpdate(
    { _id: recipientId },
    { $set: { status, durationSeconds, callOutcome, interestStatus, followUpRequired, followUpAt, summary, nextAction, callbackReason, endedAt: new Date() } },
  );
  await BulkCallAttempt.findOneAndUpdate(
    { bulkRecipientId: recipientId },
    { $set: { status, durationSeconds, endedAt: new Date(), callOutcome, interestStatus, followUpRequired, followUpAt, summary, nextAction, analysisStatus: "pending" } },
    { sort: { attemptNumber: -1 } },
  );
  await updateCampaignStats(bulkId);
}

async function markRecipientFailed(bulkId, recipientId, errorMessage) {
  await BulkCallRecipient.findOneAndUpdate(
    { _id: recipientId },
    { $set: { status: "failed", error: errorMessage, endedAt: new Date() } },
  );
  await BulkCallAttempt.findOneAndUpdate(
    { bulkRecipientId: recipientId },
    { $set: { status: "failed", error: errorMessage, endedAt: new Date(), analysisStatus: "failed", analysisError: errorMessage } },
    { sort: { attemptNumber: -1 } },
  );
  await updateCampaignStats(bulkId);
}

async function updateCampaignStats(bulkId) {
  const stats = await BulkCallRecipient.aggregate([
    { $match: { bulkCallId: bulkId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        noAnswer: { $sum: { $cond: [{ $eq: ["$status", "no_answer"] }, 1, 0] } },
        busy: { $sum: { $cond: [{ $eq: ["$status", "busy"] }, 1, 0] } },
        interested: { $sum: { $cond: [{ $eq: ["$interestStatus", "interested"] }, 1, 0] } },
        notInterested: { $sum: { $cond: [{ $eq: ["$interestStatus", "not_interested"] }, 1, 0] } },
        callbackRequested: { $sum: { $cond: [{ $eq: ["$callOutcome", "callback_requested"] }, 1, 0] } },
      },
    },
  ]);
  if (stats.length > 0) {
    const s = stats[0];
    await BulkCall.findOneAndUpdate(
      { bulkId },
      { $set: { processedCount: s.total, completedCount: s.completed, failedCount: s.failed, noAnswerCount: s.noAnswer, answeredCount: s.completed } },
    );
  }
}

async function markCampaignCompleted(bulkId) {
  await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: { status: "completed", completedAt: new Date() } },
  );
  campaignStatus.set(bulkId, { running: false, paused: false });
}

async function startBulkCall(bulkId) {
  const queue = getQueue(bulkId);
  queue.paused = false;
  queue.cancelled = false;
  queue.completed = false;
  campaignStatus.set(bulkId, { running: true, paused: false });
  for (let i = 0; i < queue.concurrency; i++) processNext(bulkId);
  return { success: true, bulkId, concurrency: queue.concurrency };
}

function pauseBulkCall(bulkId) {
  const queue = getQueue(bulkId);
  queue.paused = true;
  campaignStatus.set(bulkId, { running: true, paused: true });
  return { success: true, bulkId, paused: true };
}

function resumeBulkCall(bulkId) {
  const queue = getQueue(bulkId);
  queue.paused = false;
  campaignStatus.set(bulkId, { running: true, paused: false });
  for (let i = 0; i < queue.concurrency; i++) processNext(bulkId);
  return { success: true, bulkId, paused: false };
}

function cancelBulkCall(bulkId) {
  const queue = getQueue(bulkId);
  queue.cancelled = true;
  campaignStatus.set(bulkId, { running: false, paused: false });
  return { success: true, bulkId, cancelled: true };
}

function getBulkCallStatus(bulkId) {
  const queue = campaignQueues.get(bulkId);
  const status = campaignStatus.get(bulkId) || { running: false, paused: false };
  return {
    bulkId,
    running: status.running,
    paused: status.paused,
    cancelled: queue ? queue.cancelled : false,
    completed: queue ? queue.completed : false,
    concurrency: queue ? queue.concurrency : DEFAULT_CONCURRENCY,
  };
}

module.exports = {
  DEFAULT_CONCURRENCY,
  initQueue,
  getQueue,
  processNext,
  processRecipient,
  startBulkCall,
  pauseBulkCall,
  resumeBulkCall,
  cancelBulkCall,
  getBulkCallStatus,
  markRecipientCompleted,
  markRecipientFailed,
  updateCampaignStats,
};