// ============================================================
// BULK CALL SERVICE
// ============================================================
// Handles bulk dial campaigns - sequential outbound calls
// with configurable retry, timeout, and gap between calls.
// ============================================================

const { randomUUID } = require("crypto");
const BulkCall = require("../../models/BulkCall");
const Call = require("../../models/Call");
const { normalizePhoneNumber } = require("../../services/phoneNormalizer");
const { normalizePhoneNumberForExotel } = require("../../services/phoneNormalizer");
const { initiateExotelFlowCall } = require("../../transports/exotel/exotelCallService");
const { getCustomerContext } = require("../customer/customerContext");
const { createCall, updateCall } = require("../callService");

// In-memory store for active bulk call processors
// In production, use Redis or a job queue (BullMQ, Agenda, etc.)
const activeBulkProcessors = new Map();

/**
 * Normalize and validate phone numbers from various formats:
 * +91XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX, 0XXXXXXXXXX
 */
function parseAndNormalizeNumbers(input) {
  if (!input || typeof input !== "string") {
    return { numbers: [], errors: ["Input is required"] };
  }

  // Split by common delimiters: newline, comma, semicolon, space
  const rawNumbers = input
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const results = [];
  const errors = [];

  for (const raw of rawNumbers) {
    try {
      const normalized = normalizePhoneNumber(raw);
      results.push({
        original: raw,
        normalized,
      });
    } catch (error) {
      errors.push(`${raw}: ${error.message}`);
    }
  }

  return { numbers: results, errors };
}

/**
 * Create a new bulk call campaign
 */
async function createBulkCall({ name, phoneNumbers, config = {} }) {
  const bulkId = `BULK_${randomUUID()}`;

  const defaultConfig = {
    maxRetries: 1,
    retryDelayMs: 5000,
    callTimeoutMs: 30000,
    gapBetweenCallsMs: 5000,
    ...config,
  };

  const bulkCall = await BulkCall.create({
    bulkId,
    name: name || "Bulk Dial Campaign",
    phoneNumbers: phoneNumbers.map((n) => ({
      original: n.original,
      normalized: n.normalized,
      status: "pending",
    })),
    totalNumbers: phoneNumbers.length,
    config: defaultConfig,
    status: "created",
  });

  return bulkCall;
}

/**
 * Get bulk call by ID
 */
async function getBulkCall(bulkId) {
  return await BulkCall.findOne({ bulkId }).lean();
}

/**
 * Get all bulk calls
 */
async function listBulkCalls(limit = 50) {
  return await BulkCall.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Update bulk call progress
 */
async function updateBulkCallProgress(bulkId, updates) {
  return await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: updates },
    { new: true }
  ).lean();
}

/**
 * Update a specific phone number's status in the bulk call
 */
async function updateNumberStatus(bulkId, index, updates) {
  const setUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    setUpdates[`phoneNumbers.${index}.${key}`] = value;
  }
  return await BulkCall.findOneAndUpdate(
    { bulkId },
    { $set: setUpdates },
    { new: true }
  ).lean();
}

module.exports = {
  parseAndNormalizeNumbers,
  createBulkCall,
  getBulkCall,
  listBulkCalls,
  updateBulkCallProgress,
  updateNumberStatus,
  activeBulkProcessors,
};