// ============================================================
// CUSTOMER CONTROLLER
// ============================================================

const {
  listCustomers,
  getCustomerById,
} = require("../services/customerService");

const {
  getCallsByCustomerId,
} = require("../services/callService");

const Customer =
  require("../models/Customer");


// ============================================================
// GET CUSTOMERS
// ============================================================

async function getCustomers(req, res) {
  try {
    const requestedLimit =
      Number(req.query.limit);

    const limit =
      Number.isFinite(requestedLimit) &&
      requestedLimit > 0
        ? Math.min(requestedLimit, 200)
        : 50;

    const customers =
      await listCustomers(limit);

    return res.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error(
      "Failed to list customers:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load customers.",
    });
  }
}


// ============================================================
// GET CUSTOMER DETAILS
// ============================================================

async function getCustomerDetails(
  req,
  res,
) {
  try {
    const {
      customerId,
    } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message:
          "Customer ID is required",
      });
    }

    /*
     * The frontend can send either:
     *
     * Mongo ObjectId
     * or
     * CUS_xxxxx
     */
    const isMongoId =
      /^[0-9a-fA-F]{24}$/.test(
        customerId,
      );

    let customer = null;

    if (isMongoId) {
      customer =
        await Customer.findById(
          customerId,
        );
    } else {
      customer =
        await getCustomerById(
          customerId,
        );
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Customer not found",
      });
    }

    /*
     * Get all calls belonging to this
     * customer.
     *
     * getCallsByCustomerId already handles
     * the customerId -> phone fallback.
     */
    const calls =
      await getCallsByCustomerId(
        customer.customerId,
      );

    /*
     * Sort again here so the controller
     * does not depend on the service
     * implementation order.
     */
    const sortedCalls =
      [...calls].sort(
        (a, b) => {
          const dateA =
            new Date(
              a.startedAt ||
                a.createdAt ||
                a.endedAt ||
                0,
            ).getTime();

          const dateB =
            new Date(
              b.startedAt ||
                b.createdAt ||
                b.endedAt ||
                0,
            ).getTime();

          return dateB - dateA;
        },
      );

    const totalCalls =
      sortedCalls.length;

    const inboundCalls =
      sortedCalls.filter(
        (call) =>
          call.direction ===
          "inbound",
      ).length;

    const outboundCalls =
      sortedCalls.filter(
        (call) =>
          call.direction ===
          "outbound",
      ).length;

    const completedCalls =
      sortedCalls.filter(
        (call) =>
          call.status ===
          "completed",
      ).length;

    const failedCalls =
      sortedCalls.filter(
        (call) =>
          call.status ===
          "failed",
      ).length;

    const lastCall =
      sortedCalls[0] ||
      null;

    const hasFollowUp =
      sortedCalls.some(
        (call) =>
          call.followUpRequired ===
          true,
      );

    return res.json({
      success: true,

      customer,

      calls:
        sortedCalls,

      stats: {
        totalCalls,
        inboundCalls,
        outboundCalls,
        completedCalls,
        failedCalls,
      },

      lastCall,

      hasFollowUp,
    });
  } catch (error) {
    console.error(
      "Failed to get customer details:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load customer details.",
    });
  }
}


module.exports = {
  getCustomers,
  getCustomerDetails,
};