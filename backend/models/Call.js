// ============================================================
// CALL MODEL
// ============================================================
// Defines the MongoDB structure for every phone call.
// ============================================================

const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    externalCallSid: {
      type: String,
      default: null,
      index: true,
    },

    customerId: {
      type: String,
      default: null,
      index: true,
    },

    bulkId: {
      type: String,
      default: null,
      index: true,
    },

    phoneNumber: {
      type: String,
      default: null,
    },

    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "outbound",
    },

    status: {
      type: String,
      enum: [
        "created",
        "initiated",
        "ringing",
        "answered",
        "completed",
        "failed",
      ],
      default: "initiated",
    },

    startedAt: {
      type: Date,
      default: Date.now,
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

    summary: {
      type: String,
      default: null,
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
      index: true,
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

    callbackStatus: {
      type: String,
      enum: ["pending", "processing", "completed", null],
      default: null,
    },

    callbackReason: {
      type: String,
      default: null,
    },

    nextAction: {
      type: String,
      default: null,
    },

    summaryStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Call", callSchema);
