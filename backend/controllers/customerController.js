// ============================================================
// CUSTOMER CONTROLLER
// ============================================================
// This file handles API requests for retrieving customers.
//
// It receives the request from the frontend and uses
// customerService.js to fetch customer records.
// ============================================================

// Gets customer records from MongoDB.
const { listCustomers, getCustomerById } = require("../services/customerService");
const { getCallsByCustomerId } = require("../services/callService");
const Customer = require("../models/Customer");

// ============================================================
// GET CUSTOMERS
// ============================================================
// Purpose:
// Returns a list of customers to the frontend.
//
// Optional query parameter:
// ?limit=50
//
// Flow:
// Frontend → getCustomers() → customerService → MongoDB
// ============================================================

async function getCustomers(req, res) {
  try {
    // Get the requested number of customers.
    // Use 50 if no limit was provided.
    const limit = Number(req.query.limit) || 50;

    // Ask customerService to fetch the customers.
    const customers = await listCustomers(limit);

    // Send the customer list back to the frontend.
    return res.json({
      success: true,

      customers,
    });
  } catch (error) {
    // Log the error if fetching customers fails.
    console.error("Failed to list customers:", error);

    // Send an error response to the frontend.
    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

// ============================================================
// GET CUSTOMER DETAILS
// ============================================================
// Purpose:
// Returns detailed customer info with all call history.
//
// Flow:
// Frontend → getCustomerDetails() → customerService + callService → MongoDB
// ============================================================

async function getCustomerDetails(req, res) {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    // Check if the ID is a MongoDB ObjectId (24 hex chars) or a customerId (CUS_xxx)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(customerId);
    
    // Fetch customer - try both _id and customerId
    let customer;
    if (isMongoId) {
      customer = await Customer.findById(customerId);
    } else {
      customer = await getCustomerById(customerId);
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Fetch all calls for this customer using customerId field
    const calls = await getCallsByCustomerId(customer.customerId);

    // Calculate call statistics
    const totalCalls = calls.length;
    const inboundCalls = calls.filter((c) => c.direction === "inbound").length;
    const outboundCalls = calls.filter((c) => c.direction === "outbound").length;
    const completedCalls = calls.filter((c) => c.status === "completed").length;
    const failedCalls = calls.filter((c) => c.status === "failed").length;

    // Get the last call (most recent)
    const lastCall = calls[0] || null;

    // Check if any call has follow-up required
    const hasFollowUp = calls.some((c) => c.followUpRequired === true);

    return res.json({
      success: true,
      customer,
      calls,
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
    console.error("Failed to get customer details:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getCustomers,
  getCustomerDetails,
};
