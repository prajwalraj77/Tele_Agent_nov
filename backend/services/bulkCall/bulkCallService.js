// ============================================================
// BULK CALL SERVICE
// ============================================================
// CRUD for BulkCall campaigns using the embedded
// phoneNumbers[] architecture (no separate Recipient/Attempt models).
// ============================================================

const { randomUUID } = require("crypto");
const BulkCall = require("../../models/BulkCall");
const { normalizeAndDedup } = require("./bulkCallNormalizer");

const DEFAULT_CONFIG = {
  maxRetries: 1,
  retryDelayMs: 5000,
  callTimeoutMs: 600000,
  // REQUIRED:
  // minimum 20 seconds between completed
  // MongoDB persistence and the next call.
  gapBetweenCallsMs: 20000,
};

// Enforce the minimum gap between calls.
// The production requirement is exactly 20 seconds minimum.
function enforceMinGap(gapMs) {
  return Math.max(gapMs, 20000);
}

// Parse and normalize a raw phone-number string into valid/invalid arrays.
function parseAndNormalizeNumbers(input) {
  if (!input || typeof input !== "string") {
    return {
      numbers: [],
      errors: ["Phone number input is required."],
    };
  }

  const rawNumbers = input
    .split(/[\n,;]+/)
    .map((number) => number.trim())
    .filter((number) => number.length > 0);

  const numbers = [];
  const errors = [];

  for (const original of rawNumbers) {
    try {
      const normalized = normalizeAndDedup([original]);

      if (normalized.valid.length > 0) {
        numbers.push({
          original,
          normalized: normalized.valid[0].normalized,
        });
      } else {
        errors.push(
          `${original}: ${normalized.invalid.map((i) => i.reason).join(", ")}`,
        );
      }
    } catch (error) {
      errors.push(`${original}: ${error.message}`);
    }
  }

  return { numbers, errors };
}

// Create a bulk call campaign + recipients (embedded in BulkCall.phoneNumbers).
// Does NOT start calling - caller must POST /start explicitly.
async function createBulkCall({ name, phoneNumbers, config = {} }) {
  const bulkId = `BULK_${randomUUID()}`;

  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    gapBetweenCallsMs: enforceMinGap(
      config && config.gapBetweenCallsMs !== undefined
        ? config.gapBetweenCallsMs
        : DEFAULT_CONFIG.gapBetweenCallsMs
    ),
  };

  // phoneNumbers already arrive pre-normalized from parseAndNormalizeNumbers.
  // Build recipients directly from the validated input.
  const recipients = phoneNumbers.map((n) => ({
    original: n.original,
    normalized: n.normalized,
    status: "pending",
  }));

  const invalid = []; // already filtered by parseAndNormalizeNumbers

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

// Update campaign statistics/progress.
async function updateBulkCallProgress(bulkId, updates) {
  return await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();
}

// Update one phone-number entry within the campaign.
async function updateNumberStatus(bulkId, index, updates) {
  const setUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    setUpdates[`phoneNumbers.${index}.${key}`] = value;
  }

  return await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: setUpdates },
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
  return await updateBulkCallProgress(bulkId, update);
}

// Atomically transition campaign from "created" to "running".
// Returns the updated document if the transition succeeded,
// or null if the campaign was not in "created" state (already started,
// completed, failed, cancelled, etc.).
async function startBulkCallCampaign(bulkId) {
  return await BulkCall.findOneAndUpdate(
    { bulkId, status: "created" },
    {
      $set: {
        status: "running",
        startedAt: new Date(),
      },
    },
    { new: true, runValidators: true },
  ).lean();
}

module.exports = {
  parseAndNormalizeNumbers,
  createBulkCall,
  getBulkCall,
  listBulkCalls,
  updateBulkCallProgress,
  updateNumberStatus,
  setCampaignStatus,
  startBulkCallCampaign,
  DEFAULT_CONFIG,
};