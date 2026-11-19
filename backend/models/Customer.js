// ============================================================
// CUSTOMER MODEL
// ============================================================
// Defines the MongoDB structure for a customer.
// ============================================================

const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      default: null,
      trim: true,
    },

    phoneNumber: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },

    email: {
      type: String,
      default: null,
      trim: true,
    },

    source: {
      type: String,
      default: "crm",
    },

    // Rolling summary of the customer's overall conversation history.
    conversationSummary: {
      type: String,
      default: null,
    },

    // Overall customer engagement/interest score from 0 to 100.
    conversationRate: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // Kept for compatibility with older records.
    latestSummary: {
      type: String,
      default: null,
    },

    latestCallId: {
      type: String,
      default: null,
      index: true,
    },

    latestCallAt: {
      type: Date,
      default: null,
    },

    interestStatus: {
      type: String,
      enum: [
        "interested",
        "not_interested",
        "uncertain",
        null,
      ],
      default: null,
    },

    // Prevents future calls once the customer is not interested.
    doNotCall: {
      type: Boolean,
      default: false,
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

    callbackReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "Customer",
  customerSchema,
);