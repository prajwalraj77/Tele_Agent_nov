const Customer = require("../models/Customer");
const { randomUUID } = require("crypto");
const { normalizePhoneNumber } = require("./phoneNormalizer");

const INVALID_NAMES = new Set([
  "unknown",
  "unknown customer",
  "customer",
  "none",
  "null",
  "not known",
  "not sure",
  "don't know",
  "dont know",
  "no name",
]);

function getValidCustomerName(name) {
  if (typeof name !== "string") {
    return null;
  }

  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  if (INVALID_NAMES.has(cleanName.toLowerCase())) {
    return null;
  }

  return cleanName;
}

function normalizeCustomerPhoneNumber(phoneNumber) {
  return normalizePhoneNumber(phoneNumber);
}

function generateCustomerId() {
  return `CUS_${randomUUID()}`;
}

// ============================================================
// Returns recent customers with call statistics.
// ============================================================

async function listCustomers(limit = 50) {
  const customers = await Customer.find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

  if (customers.length === 0) {
    return [];
  }

  const customerIds = customers
    .map((customer) => customer.customerId)
    .filter(Boolean);

  const Call = require("../models/Call");

  const calls = await Call.find({
    customerId: {
      $in: customerIds,
    },
  }).lean();

  // Group calls by customerId.
  const callsByCustomer = {};

  for (const call of calls) {
    if (!call.customerId) {
      continue;
    }

    if (!callsByCustomer[call.customerId]) {
      callsByCustomer[call.customerId] = [];
    }

    callsByCustomer[call.customerId].push(call);
  }

  return customers.map((customer) => {
    const customerCalls =
      callsByCustomer[customer.customerId] || [];

    /*
     * Always determine the latest call from the actual
     * call timestamps.
     *
     * Prefer startedAt, then createdAt, then endedAt.
     */
    const getCallTime = (call) => {
      const value =
        call.startedAt ||
        call.createdAt ||
        call.endedAt;

      if (!value) {
        return 0;
      }

      const timestamp =
        new Date(value).getTime();

      return Number.isNaN(timestamp)
        ? 0
        : timestamp;
    };

    const sortedCalls = [...customerCalls].sort(
      (a, b) =>
        getCallTime(b) -
        getCallTime(a),
    );

    const latestCall =
      sortedCalls[0] || null;

    const inboundCalls =
      customerCalls.filter(
        (call) =>
          call.direction === "inbound",
      ).length;

    const outboundCalls =
      customerCalls.filter(
        (call) =>
          call.direction === "outbound",
      ).length;

    return {
      ...customer,

      callStats: {
        totalCalls:
          customerCalls.length,

        inboundCalls,

        outboundCalls,
      },

      latestCallDirection:
        latestCall?.direction ||
        null,

      latestCallStatus:
        latestCall?.status ||
        null,

      latestCallAt:
        latestCall?.startedAt ||
        latestCall?.createdAt ||
        customer.latestCallAt ||
        null,
    };
  });
}

// ============================================================
// Finds a Customer by internal ID.
// ============================================================
async function getCustomerById(customerId) {
  if (!customerId) {
    return null;
  }

  return await Customer.findOne({ customerId }).lean();
}

// ============================================================
// Creates a Customer document.
// ============================================================
async function createCustomer({ name = null, phoneNumber = null, source = "crm" }) {
  const customerId = generateCustomerId();

  const customer = await Customer.create({
    customerId,
    name: getValidCustomerName(name),
    phoneNumber: normalizeCustomerPhoneNumber(phoneNumber),
    source,
  });

  return customer.toObject();
}

// ============================================================
// Finds or creates a Customer by phone number.
// ============================================================
async function findOrCreateCustomerByPhoneNumber({ phoneNumber, name = null, source = "call" }) {
  const normalizedPhone = normalizeCustomerPhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error("Invalid phone number");
  }

  const possibleNumbers = [
    normalizedPhone,
    `+91${normalizedPhone}`,
    `91${normalizedPhone}`,
    `0${normalizedPhone}`,
  ];

  let customer = await Customer.findOne({
    phoneNumber: { $in: possibleNumbers },
  });

  if (customer) {
    return { customer: customer.toObject(), created: false };
  }

  customer = await Customer.create({
    customerId: generateCustomerId(),
    name: getValidCustomerName(name),
    phoneNumber: `+91${normalizedPhone}`,
    source,
  });

  return { customer: customer.toObject(), created: true };
}

// ============================================================
// Finds or creates a Customer by name.
// ============================================================
async function findOrCreateCustomerByName({ name, phoneNumber = null, source = "crm" }) {
  const validName = getValidCustomerName(name);

  if (!validName) {
    throw new Error("Invalid name");
  }

  let customer = await Customer.findOne({ name: validName });

  if (customer) {
    return { customer: customer.toObject(), created: false };
  }

  customer = await Customer.create({
    customerId: generateCustomerId(),
    name: validName,
    phoneNumber: normalizeCustomerPhoneNumber(phoneNumber),
    source,
  });

  return { customer: customer.toObject(), created: true };
}

// ============================================================
// Finds a Customer by normalized phone number.
// ============================================================
async function getCustomerByPhoneNumber(phoneNumber) {
  const normalizedPhone = normalizeCustomerPhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    return null;
  }

  const possibleNumbers = [
    normalizedPhone,
    `+91${normalizedPhone}`,
    `91${normalizedPhone}`,
    `0${normalizedPhone}`,
  ];

  return await Customer.findOne({
    phoneNumber: { $in: possibleNumbers },
  }).lean();
}

// ============================================================
// Updates Customer.conversationSummary.
// ============================================================
async function updateCustomerSummary(customerId, summary) {
  if (!customerId) {
    return null;
  }

  return await Customer.findOneAndUpdate(
    { customerId },
    { conversationSummary: summary },
    { new: true }
  ).lean();
}

// ============================================================
// Updates the customer name after validation.
// ============================================================
async function updateCustomerName(customerId, name) {
  if (!customerId) {
    return null;
  }

  const validName = getValidCustomerName(name);

  if (!validName) {
    return null;
  }

  return await Customer.findOneAndUpdate(
    { customerId },
    { name: validName },
    { new: true }
  ).lean();
}

// ============================================================
// Updates the final customer state after a completed call.
// ============================================================
async function updateCustomerAfterCall(
  customerId,
  analysis,
  callData,
  conversationSummary,
  conversationRate
) {
  if (!customerId) {
    return null;
  }

  const explicitlyNotInterested =
    analysis?.interestStatus === "not_interested" ||
    analysis?.callOutcome === "not_interested";

  const updates = {
    latestCallId: callData?.callId || null,
    latestCallAt: callData?.endedAt || new Date(),
    conversationSummary,
    conversationRate: explicitlyNotInterested ? 0 : conversationRate,
    interestStatus: explicitlyNotInterested ? "not_interested" : analysis?.interestStatus || "uncertain",
    doNotCall: explicitlyNotInterested ? true : undefined,
    followUpRequired: explicitlyNotInterested ? false : analysis?.followUpRequired || false,
    followUpDate: explicitlyNotInterested ? null : callData?.followUpDate || null,
    followUpAt: explicitlyNotInterested ? null : callData?.followUpAt || null,
    callbackReason: explicitlyNotInterested ? null : analysis?.callbackReason || null,
  };

  // Only update name if provided and valid
  if (analysis?.customerName) {
    const validName = getValidCustomerName(analysis.customerName);
    if (validName) {
      updates.name = validName;
    }
  }

  // Remove undefined fields
  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  });

  return await Customer.findOneAndUpdate(
    { customerId },
    { $set: updates },
    { new: true }
  ).lean();
}

module.exports = {
  getValidCustomerName,
  normalizeCustomerPhoneNumber,
  createCustomer,
  findOrCreateCustomerByPhoneNumber,
  findOrCreateCustomerByName,
  getCustomerById,
  getCustomerByPhoneNumber,
  updateCustomerSummary,
  updateCustomerName,
  updateCustomerAfterCall,
  listCustomers,
};
