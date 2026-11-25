// ============================================================
// BULK CALL RECIPIENT MODEL
// ============================================================
// Individual recipient within a bulk call campaign.
// Links to existing Customer (no duplicate customer database).
// ============================================================

const mongoose = require("mongoose");

const bulkCallRecipientSchema = new mongoose.Schema(
  {
    bulkCallId: {
      type: String,
      required: true,
      index: true,
    },

    customerId: {
      type: String,
      default: null,
      index: true,
    },

    name: {
      type: String,
      default: null,
    },

    phoneNumber: {
      type: String,
      required: true,
    },

    normalizedPhoneNumber: {
      type: String,
      required: true,
      index: true,
    },

    originalPhoneNumber: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "queued",
        "calling",
        "answered",
        "completed",
        "failed",
        "no_answer",
        "busy",
        "invalid",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    attemptCount: {
      type: Number,
      default: 0,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    nextAttemptAt: {
      type: Date,
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

    exotelCallSid: {
      type: String,
      default: null,
    },

    callId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: one recipient per number per campaign
bulkCallRecipientSchema.index(
  { bulkCallId: 1, normalizedPhoneNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  "BulkCallRecipient",
  bulkCallRecipientSchema,
);