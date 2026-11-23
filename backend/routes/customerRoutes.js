const express = require("express");
// Gets customer records from MongoDB.
const { getCustomers, getCustomerDetails } = require("../controllers/customerController");

const router = express.Router();

// Gets customers.
router.get("/", getCustomers);

// Gets customer details with call history.
router.get("/:customerId/details", getCustomerDetails);

module.exports = router;
