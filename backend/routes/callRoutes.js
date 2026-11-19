// Defines API routes for calls.

const express = require("express");

// Gets calls, pending follow-ups, and starts a new call.
const {
  getCalls,
  getPendingFollowUps,
  initiateCall,
} = require("../controllers/callController");

const router = express.Router();

// Gets recent calls.
router.get("/", getCalls);

// Gets pending follow-ups.
router.get("/follow-ups", getPendingFollowUps);

// Starts a new call.
router.post("/", initiateCall);

module.exports = router;
