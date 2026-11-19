// ============================================================
// CUSTOMER CONTROLLER
// ============================================================
// This file handles API requests for retrieving customers.
//
// It receives the request from the frontend and uses
// customerService.js to fetch customer records.
// ============================================================

// Gets customer records from MongoDB.
const { listCustomers } = require("../services/customerService");

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

module.exports = {
  getCustomers,
};
