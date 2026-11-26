// ============================================================
// BULK CALL SERVICE
// ============================================================
// Handles creation and persistence of outbound bulk campaigns.
// ============================================================

const {
  randomUUID,
} = require("crypto");

const BulkCall =
  require("../../models/BulkCall");

const {
  normalizePhoneNumber,
} = require("../../services/phoneNormalizer");

// In-memory store for currently running campaign processors.
//
// This is acceptable for the current single-server MVP.
// Later, move campaign locks/state to Redis or a queue such
// as BullMQ when running multiple backend instances.
const activeBulkProcessors =
  new Map();

// ============================================================
// PARSE + NORMALIZE NUMBERS
// ============================================================

function parseAndNormalizeNumbers(
  input,
) {
  if (
    !input ||
    typeof input !== "string"
  ) {
    return {
      numbers: [],
      errors: [
        "Phone number input is required.",
      ],
    };
  }

  const rawNumbers =
    input
      .split(
        /[\n,;]+/,
      )
      .map(
        (number) =>
          number.trim(),
      )
      .filter(
        (number) =>
          number.length > 0,
      );

  const numbers = [];
  const errors = [];

  for (
    const original of rawNumbers
  ) {
    try {
      const normalized =
        normalizePhoneNumber(
          original,
        );

      numbers.push({
        original,
        normalized,
      });
    } catch (error) {
      errors.push(
        `${original}: ${error.message}`,
      );
    }
  }

  return {
    numbers,
    errors,
  };
}

// ============================================================
// CREATE CAMPAIGN
// ============================================================

async function createBulkCall({
  name,
  phoneNumbers,
  config = {},
}) {
  const bulkId =
    `BULK_${randomUUID()}`;

  const finalConfig = {
    maxRetries: 1,

    retryDelayMs:
      5000,

    callTimeoutMs:
      600000,

    // REQUIRED:
    // exactly 20 seconds between completed
    // MongoDB persistence and the next call.
    gapBetweenCallsMs:
      20000,

    ...config,
  };

  // Do not allow a smaller gap than 20 seconds.
  //
  // This is intentional. The business requirement is
  // "wait exactly 20 seconds".
  if (
    finalConfig.gapBetweenCallsMs <
    20000
  ) {
    finalConfig.gapBetweenCallsMs =
      20000;
  }

  const bulkCall =
    await BulkCall.create({
      bulkId,

      name:
        name ||
        "Bulk Dial Campaign",

      phoneNumbers:
        phoneNumbers.map(
          (number) => ({
            original:
              number.original,

            normalized:
              number.normalized,

            status:
              "pending",
          }),
        ),

      totalNumbers:
        phoneNumbers.length,

      processedCount:
        0,

      answeredCount:
        0,

      failedCount:
        0,

      noAnswerCount:
        0,

      currentIndex:
        -1,

      currentCallId:
        null,

      currentExternalCallSid:
        null,

      lastPersistedCallId:
        null,

      failureReason:
        null,

      lastError:
        null,

      config:
        finalConfig,

      status:
        "created",
    });

  return bulkCall;
}

// ============================================================
// GET CAMPAIGN
// ============================================================

async function getBulkCall(
  bulkId,
) {
  return await BulkCall
    .findOne({
      bulkId,
    })
    .lean();
}

// ============================================================
// LIST CAMPAIGNS
// ============================================================

async function listBulkCalls(
  limit = 50,
) {
  return await BulkCall
    .find({})
    .sort({
      createdAt:
        -1,
    })
    .limit(
      limit,
    )
    .lean();
}

// ============================================================
// UPDATE CAMPAIGN
// ============================================================

async function updateBulkCallProgress(
  bulkId,
  updates,
) {
  return await BulkCall
    .findOneAndUpdate(
      {
        bulkId,
      },
      {
        $set:
          updates,
      },
      {
        returnDocument:
          "after",
        runValidators:
          true,
      },
    )
    .lean();
}

// ============================================================
// UPDATE ONE PHONE NUMBER
// ============================================================

async function updateNumberStatus(
  bulkId,
  index,
  updates,
) {
  const setUpdates = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(
      updates,
    )
  ) {
    setUpdates[
      `phoneNumbers.${index}.${key}`
    ] = value;
  }

  return await BulkCall
    .findOneAndUpdate(
      {
        bulkId,
      },
      {
        $set:
          setUpdates,
      },
      {
        returnDocument:
          "after",
        runValidators:
          true,
      },
    )
    .lean();
}

// ============================================================
// ACTIVE PROCESSOR
// ============================================================

module.exports =
  {
    parseAndNormalizeNumbers,
    createBulkCall,
    getBulkCall,
    listBulkCalls,
    updateBulkCallProgress,
    updateNumberStatus,
    activeBulkProcessors,
  };