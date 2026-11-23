// ============================================================
// BULK CALL MODEL
// ============================================================
// Defines the MongoDB structure for bulk dial campaigns.
// ============================================================

const mongoose = require("mongoose");

const bulkCallSchema = new mongoose.Schema(
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
    },

    phoneNumbers: [
      {
        original: { type: String, required: true },
        normalized: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "calling", "answered", "completed", "failed", "no_answer", "skipped"],
          default: "pending",
        },
        callId: { type: String, default: null },
        externalCallSid: { type: String, default: null },
        error: { type: String, default: null },
        startedAt: { type: Date, default: null },
        answeredAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        durationSeconds: { type: Number, default: 0 },
        attempts: { type: Number, default: 0 },
      },
    ],

    totalNumbers: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    answeredCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    noAnswerCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["created", "running", "paused", "completed", "failed", "cancelled"],
      default: "created",
    },

    // Configuration
    config: {
      maxRetries: { type: Number, default: 1 },
      retryDelayMs: { type: Number, default: 5000 },
      callTimeoutMs: { type: Number, default: 30000 },
      gapBetweenCallsMs: { type: Number, default: 5000 },
    },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    createdBy: { type: String, default: "system" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BulkCall", bulkCallSchema);