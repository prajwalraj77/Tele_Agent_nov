// ============================================================
// BULK CALL MODEL
// ============================================================
// Defines the MongoDB structure for outbound bulk campaigns.
// ============================================================

const mongoose = require("mongoose");

const phoneNumberSchema =
  new mongoose.Schema(
    {
      original: {
        type: String,
        required: true,
        trim: true,
      },

      normalized: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "calling",
          "answered",
          "completed",
          "failed",
          "no_answer",
          "skipped",
        ],
        default: "pending",
      },

      callId: {
        type: String,
        default: null,
      },

      externalCallSid: {
        type: String,
        default: null,
      },

      error: {
        type: String,
        default: null,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      answeredAt: {
        type: Date,
        default: null,
      },

      endedAt: {
        type: Date,
        default: null,
      },

      durationSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },

      attempts: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    },
  );

const bulkCallSchema =
  new mongoose.Schema(
    {
      bulkId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      name: {
        type: String,
        default: "Bulk Dial Campaign",
        trim: true,
      },

      phoneNumbers: {
        type: [phoneNumberSchema],
        default: [],
      },

      totalNumbers: {
        type: Number,
        default: 0,
      },

      processedCount: {
        type: Number,
        default: 0,
      },

      answeredCount: {
        type: Number,
        default: 0,
      },

      failedCount: {
        type: Number,
        default: 0,
      },

      noAnswerCount: {
        type: Number,
        default: 0,
      },

      // ======================================================
      // CAMPAIGN STATUS
      // ======================================================

      status: {
        type: String,
        enum: [
          "created",
          "running",
          "paused",
          "completed",
          "failed",
          "cancelled",
        ],
        default: "created",
        index: true,
      },

      // ======================================================
      // CONFIGURATION
      // ======================================================

      config: {
        // Number of attempts for a number.
        maxRetries: {
          type: Number,
          default: 1,
          min: 1,
        },

        // Delay before retrying a failed call.
        retryDelayMs: {
          type: Number,
          default: 5000,
          min: 0,
        },

        // Safety timeout for the complete active call.
        //
        // IMPORTANT:
        // This is NOT used to start another call while the
        // previous call is still active.
        //
        // If this timeout is reached, the campaign fails.
        callTimeoutMs: {
          type: Number,
          default: 600000,
          min: 60000,
        },

        // Mandatory delay after successful MongoDB
        // call finalization.
        gapBetweenCallsMs: {
          type: Number,
          default: 20000,
          min: 20000,
        },
      },

      // ======================================================
      // CURRENT EXECUTION STATE
      // ======================================================

      currentIndex: {
        type: Number,
        default: -1,
      },

      currentCallId: {
        type: String,
        default: null,
        index: true,
      },

      currentExternalCallSid: {
        type: String,
        default: null,
      },

      lastPersistedCallId: {
        type: String,
        default: null,
      },

      // ======================================================
      // FAILURE INFORMATION
      // ======================================================

      failureReason: {
        type: String,
        default: null,
      },

      lastError: {
        type: String,
        default: null,
      },

      // ======================================================
      // TIMESTAMPS
      // ======================================================

      startedAt: {
        type: Date,
        default: null,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      createdBy: {
        type: String,
        default: "system",
      },
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "BulkCall",
    bulkCallSchema,
  );