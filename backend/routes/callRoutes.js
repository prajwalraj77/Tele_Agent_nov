// Defines API routes for calls.

const express = require("express");

// Gets calls, pending follow-ups, and starts a new call.
const {
  getCalls,
  getPendingFollowUps,
  initiateCall,
  initiateBulkCall,
  getBulkCallStatus,
  listBulkCalls,
  pauseBulkCall,
  resumeBulkCall,
  cancelBulkCall,
  getBulkCallCalls,
} = require("../controllers/callController");

const router = express.Router();

// Gets recent calls.
router.get("/", getCalls);

// Gets pending follow-ups.
router.get("/follow-ups", getPendingFollowUps);

// Starts a new call.
router.post("/", initiateCall);

// Bulk call routes
router.post("/bulk", initiateBulkCall);
router.get("/bulk", listBulkCalls);
router.get("/bulk/:bulkId", getBulkCallStatus);
router.get("/bulk/:bulkId/calls", getBulkCallCalls);
router.post("/bulk/:bulkId/pause", pauseBulkCall);
router.post("/bulk/:bulkId/resume", resumeBulkCall);
router.post("/bulk/:bulkId/cancel", cancelBulkCall);

module.exports = router;
