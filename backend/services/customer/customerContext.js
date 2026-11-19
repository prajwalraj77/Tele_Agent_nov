// ============================================================
// CUSTOMER CONTEXT
// ============================================================
// Finds a customer using their phone number and prepares the
// combined customer conversation context for the AI.
// ============================================================

const Customer = require("../../models/Customer");

// Normalizes an Indian phone number.
function normalizePhoneNumber(phone) {
  if (!phone) {
    return null;
  }

  let normalized = String(phone).trim();

  normalized = normalized.replace(/\D/g, "");

  if (
    normalized.startsWith("91") &&
    normalized.length === 12
  ) {
    normalized = normalized.slice(2);
  }

  if (
    normalized.startsWith("0") &&
    normalized.length === 11
  ) {
    normalized = normalized.slice(1);
  }

  if (normalized.length !== 10) {
    return null;
  }

  return normalized;
}

// Finds a customer using multiple Indian phone formats.
async function findCustomerByPhone(phone) {
  const normalizedPhone =
    normalizePhoneNumber(phone);

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
    phoneNumber: {
      $in: possibleNumbers,
    },
  }).lean();
}

// Gets the customer context before a call.
async function getCustomerContext(phone) {
  const normalizedPhone =
    normalizePhoneNumber(phone);

  console.log("");
  console.log("=================================");
  console.log("CUSTOMER CONTEXT LOOKUP");
  console.log("=================================");

  console.log(
    "Original phone:",
    phone,
  );

  console.log(
    "Normalized phone:",
    normalizedPhone,
  );

  if (!normalizedPhone) {
    console.log(
      "Invalid or missing phone number.",
    );

    return {
      customerExists: false,
      customerId: null,
      customerName: null,
      firstName: null,
      previousSummary: null,
      conversationRate: null,
      phoneNumber: null,
      interestStatus: null,
      doNotCall: false,
      customer: null,
    };
  }

  const customer =
    await findCustomerByPhone(
      normalizedPhone,
    );

  if (!customer) {
    console.log(
      "Customer not found. New customer.",
    );

    console.log("=================================");
    console.log("");

    return {
      customerExists: false,
      customerId: null,
      customerName: null,
      firstName: null,
      previousSummary: null,
      conversationRate: null,
      phoneNumber: `+91${normalizedPhone}`,
      interestStatus: null,
      doNotCall: false,
      customer: null,
    };
  }

  const customerName =
    customer.name || null;

  const firstName =
    customerName
      ? customerName
          .trim()
          .split(/\s+/)[0]
      : null;

  const customerId =
    customer.customerId || null;

  const previousSummary =
    customer.conversationSummary ||
    customer.latestSummary ||
    null;

  const conversationRate =
    typeof customer.conversationRate ===
      "number"
      ? customer.conversationRate
      : null;

  console.log(
    "Existing customer:",
    true,
  );

  console.log(
    "Customer ID:",
    customerId,
  );

  console.log(
    "Customer name:",
    customerName,
  );

  console.log(
    "First name:",
    firstName,
  );

  console.log(
    "Interest:",
    customer.interestStatus ||
      "Unknown",
  );

  console.log(
    "Conversation rate:",
    conversationRate ??
      "Not calculated",
  );

  console.log(
    "Do Not Call:",
    customer.doNotCall === true,
  );

  console.log(
    "Combined summary available:",
    Boolean(previousSummary),
  );

  if (previousSummary) {
    console.log(
      "Customer conversation summary:",
      previousSummary,
    );
  }

  console.log("=================================");
  console.log("");

  return {
    customerExists: true,

    customerId,

    customerName,

    firstName,

    previousSummary,

    conversationRate,

    phoneNumber:
      customer.phoneNumber ||
      `+91${normalizedPhone}`,

    interestStatus:
      customer.interestStatus || null,

    doNotCall:
      customer.doNotCall === true,

    customer,
  };
}

module.exports = {
  normalizePhoneNumber,
  findCustomerByPhone,
  getCustomerContext,
};