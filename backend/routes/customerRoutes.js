const express = require("express");
// Gets customer records from MongoDB.
const { getCustomers } = require("../controllers/customerController");

const router = express.Router();

// Gets customers.
router.get("/", getCustomers);

module.exports = router;
