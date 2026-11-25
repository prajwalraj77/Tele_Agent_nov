// ============================================================
// BULK CALL SERVICE
// ============================================================
// CRUD for BulkCall campaigns + recipient management.
// Links recipients to existing Customer (no duplicate DB).
// ============================================================

const { randomUUID } = require("crypto");
const BulkCall = require("../../models/BulkCall");
const BulkCallRecipient = require("../../models/BulkCallRecipient");
const { normalizeAndDedup } = require("./bulkCallNormalizer");
const { findOrCreateCustomerByPhoneNumber } = require("../customerService");

const DEFAULT_CONFIG = {
  maxRetries: 1,
  retryDelayMs: 5000,
  callTimeoutMs: 30000,
  gapBetweenCallsMs: 5000,
  concurrency: 3,
};

// Create a bulk call campaign + recipients.
async function createBulkCall({ name, phoneNumbers, config = {} }) {
  const bulkId = `BULK_${randomUUID()}`;

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Normalize and deduplicate input numbers
  const { valid, invalid } = normalizeAndDedup(phoneNumbers);

  const recipients = valid.map((n) => ({
    original: n.original,
    normalized: n.normalized,
    status: "pending",
  }));

  const bulkCall = await BulkCall.create({
    bulkId,
    name: name || "Bulk Dial Campaign",
    phoneNumbers: recipients,
    totalNumbers: recipients.length,
    config: mergedConfig,
    status: "created",
  });

  return {
    success: true,
    bulkId,
    bulkCall,
    totalNumbers: recipients.length,
    validNumbers: recipients.length,
    invalidNumbers: invalid.length,
    errors: invalid.length > 0 ? invalid : undefined,
    message: `Bulk campaign created with ${recipients.length} valid number(s)`,
  };
}

// Get bulk call by ID.
async function getBulkCall(bulkId) {
  return await BulkCall.findOne({ bulkId }).lean();
}

// List bulk calls.
async function listBulkCalls(limit = 50) {
  return await BulkCall.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

// Update bulk call status/progress.
async function updateBulkCall(bulkId, updates) {
  return await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();
}

// Update campaign statistics.
async function updateBulkCallStats(bulkId, updates) {
  return await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();
}

// Mark campaign status.
async function setCampaignStatus(bulkId, status) {
  const update = { status };
  if (status === "running") {
    update.startedAt = new Date();
  }
  if (status === "completed" || status === "cancelled" || status === "failed") {
    update.completedAt = new Date();
  }
  return await updateBulkCall(bulkId, update);
}

// Get recipients for a campaign.
async function getRecipients(bulkId) {
  return await BulkCallRecipient.find({ bulkCallId: bulkId })
    .sort({ createdAt: 1 })
    .lean();
}

// Get attempts for a campaign.
async function getAttempts(bulkId) {
  const recipients = await BulkCallRecipient.find({ bulkCallId: bulkId })
    .lean();
  const recipientIds = recipients.map((r) => r._id);

  return await BulkCallAttempt.find({ bulkRecipientId: { $in: recipientIds } })
    .sort({ attemptNumber: -1, createdAt: -1 })
    .lean();
}

// Link recipients to customers (called after bulk call creation).
async function linkRecipientsToCustomers(bulkId) {
  const recipients = await BulkCallRecipient.find({ bulkCallId: bulkId }).lean();

  for (const recipient of recipients) {
    try {
      const result = await findOrCreateCustomerByPhoneNumber({
        phoneNumber: recipient.normalizedPhoneNumber,
        name: recipient.name || null,
        source: "bulk",
      });

      await BulkCallRecipient.findOneAndUpdate(
        { _id: recipient._id },
        { $set: { customerId: result.customer.customerId } },
        { new: true },
      );
    } catch (error) {
      console.error(`Failed to link customer for recipient ${recipient.normalizedPhoneNumber}:`, error.message);
    }
  }
}

module.exports = {
  createBulkCall,
  getBulkCall,
  listBulkCalls,
  updateBulkCall,
  updateBulkCallStats,
  setCampaignStatus,
  getRecipients,
  getAttempts,
  linkRecipientsToCustomers,
  DEFAULT_CONFIG,
};