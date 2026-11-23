// ============================================================
// CUSTOMER SERVICE
// ============================================================
// Handles customer creation, lookup, and post-call updates.
// ============================================================

const Customer =
  require("../models/Customer");

const {
  randomUUID,
} = require("crypto");

// Validates customer names.
function getValidCustomerName(
  name,
) {
  if (
    typeof name !==
    "string"
  ) {
    return null;
  }

  const cleanName =
    name.trim();

  if (!cleanName) {
    return null;
  }

  const invalidNames =
    new Set([
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

  if (
    invalidNames.has(
      cleanName.toLowerCase(),
    )
  ) {
    return null;
  }

  return cleanName;
}

// Normalizes Indian phone numbers.
function normalizeCustomerPhoneNumber(
  phoneNumber,
) {
  if (!phoneNumber) {
    return null;
  }

  let phone =
    String(
      phoneNumber,
    ).trim();

  phone =
    phone.replace(
      /[\s\-()]/g,
      "",
    );

  if (
    /^\+91\d{10}$/.test(
      phone,
    )
  ) {
    return phone;
  }

  if (
    /^91\d{10}$/.test(
      phone,
    )
  ) {
    return `+${phone}`;
  }

  if (
    /^0\d{10}$/.test(
      phone,
    )
  ) {
    return `+91${phone.slice(1)}`;
  }

  if (
    /^\d{10}$/.test(
      phone,
    )
  ) {
    return `+91${phone}`;
  }

  return null;
}

// Creates a new customer.
async function createCustomer({
  customerId,
  name = null,
  phoneNumber = null,
  source = "crm",
}) {
  const normalizedPhone =
    normalizeCustomerPhoneNumber(
      phoneNumber,
    );

  const validName =
    getValidCustomerName(
      name,
    );

  return await Customer.create({
    customerId,

    name:
      validName,

    phoneNumber:
      normalizedPhone,

    source,
  });
}

// Finds or creates a customer by phone.
async function findOrCreateCustomerByPhoneNumber({
  phoneNumber,
  name = null,
  source = "crm",
}) {
  const normalizedPhone =
    normalizeCustomerPhoneNumber(
      phoneNumber,
    );

  const validName =
    getValidCustomerName(
      name,
    );

  if (!normalizedPhone) {
    throw new Error(
      "Invalid customer phone number",
    );
  }

  const existingCustomer =
    await Customer.findOne({
      phoneNumber:
        normalizedPhone,
    });

  if (existingCustomer) {
    if (
      validName &&
      !getValidCustomerName(
        existingCustomer.name,
      )
    ) {
      existingCustomer.name =
        validName;

      await existingCustomer.save();
    }

    return {
      customer:
        existingCustomer,

      isNew:
        false,
    };
  }

  const customerId =
    `CUS_${randomUUID()}`;

  try {
    const customer =
      await Customer.create({
        customerId,

        name:
          validName,

        phoneNumber:
          normalizedPhone,

        source,
      });

    return {
      customer,

      isNew:
        true,
    };
  } catch (error) {
    if (
      error?.code ===
      11000
    ) {
      const existingCustomer =
        await Customer.findOne({
          phoneNumber:
            normalizedPhone,
        });

      if (
        existingCustomer
      ) {
        return {
          customer:
            existingCustomer,

          isNew:
            false,
        };
      }
    }

    throw error;
  }
}

// Finds or creates a customer by name.
async function findOrCreateCustomerByName({
  name,
  customerId = null,
  source = "browser",
}) {
  const cleanName =
    getValidCustomerName(
      name,
    );

  if (!cleanName) {
    throw new Error(
      "Customer name is required",
    );
  }

  const escapedName =
    cleanName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const existingCustomer =
    await Customer.findOne({
      name:
        new RegExp(
          `^${escapedName}$`,
          "i",
        ),
    });

  if (
    existingCustomer
  ) {
    return {
      customer:
        existingCustomer,

      isNew:
        false,
    };
  }

  const customer =
    await Customer.create({
      customerId:
        customerId ||
        `CUS_${randomUUID()}`,

      name:
        cleanName,

      source,
    });

  return {
    customer,

    isNew:
      true,
  };
}

// Gets a customer by ID.
async function getCustomerById(
  customerId,
) {
  return await Customer.findOne({
    customerId,
  });
}

// Gets a customer by phone.
async function getCustomerByPhoneNumber(
  phoneNumber,
) {
  const normalizedPhone =
    normalizeCustomerPhoneNumber(
      phoneNumber,
    );

  if (!normalizedPhone) {
    return null;
  }

  return await Customer.findOne({
    phoneNumber:
      normalizedPhone,
  });
}

// Updates the rolling customer summary.
async function updateCustomerSummary(
  customerId,
  summary,
) {
  return await Customer.findOneAndUpdate(
    { customerId },

    {
      $set: {
        conversationSummary:
          summary,
      },
    },

    {
      new: true,
    },
  );
}

// Updates a customer's name.
async function updateCustomerName(
  customerId,
  name,
) {
  const cleanName =
    getValidCustomerName(
      name,
    );

  if (!cleanName) {
    return null;
  }

  return await Customer.findOneAndUpdate(
    { customerId },

    {
      $set: {
        name:
          cleanName,
      },
    },

    {
      new: true,
    },
  );
}

// Saves final customer state after a call.
async function updateCustomerAfterCall(
  customerId,
  analysis,
  call,
  conversationSummary = null,
  conversationRate = null,
) {
  if (!customerId) {
    console.warn(
      "updateCustomerAfterCall called without customerId",
    );

    return null;
  }

  const existingCustomer =
    await Customer.findOne({
      customerId,
    });

  if (!existingCustomer) {
    throw new Error(
      `Customer ${customerId} was not found while updating after call.`,
    );
  }

  const explicitlyNotInterested =
    analysis?.interestStatus ===
    "not_interested";

  const doNotCall =
    existingCustomer.doNotCall ===
      true ||
    explicitlyNotInterested;

  let finalConversationRate =
    conversationRate;

  if (
    explicitlyNotInterested
  ) {
    finalConversationRate =
      0;
  }

  if (
    !Number.isFinite(
      finalConversationRate,
    )
  ) {
    finalConversationRate =
      existingCustomer.conversationRate ??
      null;
  }

  if (
    Number.isFinite(
      finalConversationRate,
    )
  ) {
    finalConversationRate =
      Math.round(
        Math.max(
          0,
          Math.min(
            100,
            finalConversationRate,
          ),
        ),
      );
  }

  const updates = {
    latestCallId:
      call.callId ||
      null,

    latestCallAt:
      call.endedAt ||
      new Date(),

    interestStatus:
      analysis?.interestStatus ||
      existingCustomer.interestStatus ||
      null,

    conversationRate:
      finalConversationRate,

    doNotCall,

    followUpRequired:
      doNotCall
        ? false
        : Boolean(
            analysis?.followUpRequired,
          ),

    followUpDate:
      doNotCall
        ? null
        : call.followUpDate ||
          null,

    followUpAt:
      doNotCall
        ? null
        : call.followUpAt ||
          null,

    callbackReason:
      doNotCall
        ? null
        : analysis?.callbackReason ||
          null,
  };

  if (
    conversationSummary
  ) {
    updates.conversationSummary =
      conversationSummary;
  }

  // Keeps the latest call summary available for compatibility.
  if (
    analysis?.summary
  ) {
    updates.latestSummary =
      analysis.summary;
  }

  const validName =
    getValidCustomerName(
      analysis?.customerName,
    );

  if (validName) {
    updates.name =
      validName;
  }

  const customer =
    await Customer.findOneAndUpdate(
      { customerId },

      {
        $set:
          updates,
      },

      {
        new: true,
        runValidators: true,
      },
    );

  if (!customer) {
    throw new Error(
      `Customer ${customerId} was not found while updating after call.`,
    );
  }

  console.log("");
  console.log(
    "=================================",
  );
  console.log(
    "CUSTOMER CONTEXT SAVED",
  );
  console.log(
    "=================================",
  );

  console.log(
    "Customer ID:",
    customer.customerId,
  );

  console.log(
    "Name:",
    customer.name ||
      "None",
  );

  console.log(
    "Interest:",
    customer.interestStatus ||
      "Unknown",
  );

  console.log(
    "Conversation Rate:",
    customer.conversationRate ??
      "Not calculated",
  );

  console.log(
    "Do Not Call:",
    customer.doNotCall,
  );

  console.log(
    "Conversation Summary:",
    customer.conversationSummary
      ? "Saved"
      : "None",
  );

  console.log(
    "Follow-up Date:",
    customer.followUpDate ||
      "None",
  );

  console.log(
    "Follow-up At:",
    customer.followUpAt ||
      "None",
  );

  console.log(
    "=================================",
  );
  console.log("");

  return customer;
}

// Returns recent customers with call statistics.
async function listCustomers(
  limit = 50,
) {
  const customers = await Customer.find({})
    .sort({
      updatedAt:
        -1,
    })
    .limit(limit)
    .lean();

  if (customers.length === 0) {
    return [];
  }

  // Get call statistics for all customers
  const customerIds = customers.map((c) => c.customerId);
  const Call = require("../models/Call");

  const calls = await Call.find({ customerId: { $in: customerIds } }).lean();

  // Group calls by customerId
  const callsByCustomer = {};
  for (const call of calls) {
    if (!callsByCustomer[call.customerId]) {
      callsByCustomer[call.customerId] = [];
    }
    callsByCustomer[call.customerId].push(call);
  }

  // Enrich customers with call stats
  const enrichedCustomers = customers.map((customer) => {
    const customerCalls = callsByCustomer[customer.customerId] || [];
    const totalCalls = customerCalls.length;
    const inboundCalls = customerCalls.filter((c) => c.direction === "inbound").length;
    const outboundCalls = customerCalls.filter((c) => c.direction === "outbound").length;
    const latestCall = customerCalls.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0] || null;

    return {
      ...customer,
      callStats: {
        totalCalls,
        inboundCalls,
        outboundCalls,
      },
      latestCallDirection: latestCall?.direction || null,
      latestCallStatus: latestCall?.status || null,
      latestCallAt: latestCall?.startedAt || customer.latestCallAt || null,
    };
  });

  return enrichedCustomers;
}

module.exports = {
  createCustomer,
  findOrCreateCustomerByPhoneNumber,
  findOrCreateCustomerByName,
  getCustomerById,
  getCustomerByPhoneNumber,
  updateCustomerSummary,
  updateCustomerName,
  updateCustomerAfterCall,
  listCustomers,
  normalizeCustomerPhoneNumber,
  getValidCustomerName,
};