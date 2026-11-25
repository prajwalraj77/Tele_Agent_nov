// ============================================================
// BULK CALL ATTEMPT MODEL
// ============================================================
// Immutable history of each call attempt for a bulk recipient.
// Never overwritten - new attempts are appended.
// ============================================================

const mongoose = require("mongoose");

const bulkCallAttemptSchema = new mongoose.Schema(
  {
    bulkAttemptId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    bulkCallId: {
      type: String,
      required: true,
      index: true,
    },

    bulkRecipientId: {
      type: String,
      required: true,
      index: true,
    },

    customerId: {
      type: String,
      default: null,
      index: true,
    },

    attemptNumber: {
      type: Number,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    normalizedPhoneNumber: {
      type: String,
      required: true,
    },

    exotelCallSid: {
      type: String,
      default: null,
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
        "busy",
        "cancelled",
      ],
      default: "pending",
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
    },

    language: {
      type: String,
      default: null,
    },

    interestStatus: {
      type: String,
      enum: ["interested", "not_interested", "uncertain", null],
      default: null,
    },

    callOutcome: {
      type: String,
      enum: [
        "normal",
        "callback_requested",
        "demo_visit_confirmed",
        "not_interested",
        "no_response",
        null,
      ],
      default: null,
    },

    followUpRequired: {
      type: Boolean,
      default: false,
    },

    followUpDate: {
      type: Date,
      default: null,
    },

    followUpAt: {
      type: Date,
      default: null,
    },

    summary: {
      type: String,
      default: null,
    },

    nextAction: {
      type: String,
      default: null,
    },

    analysisStatus: {
      type: String,
      enum: ["pending", "completed", "failed", null],
      default: null,
    },

    analysisError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for querying attempts by campaign and recipient
bulkCallAttemptSchema.index({ bulkCallId: 1, bulkRecipientId: 1, attemptNumber: 1 });

module.exports = mongoose.model(
  "BulkCallAttempt",
  bulkCallAttemptSchema,
);