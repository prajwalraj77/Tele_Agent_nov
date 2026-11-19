// ============================================================
// EXOTEL ROUTES
// ============================================================
// Defines HTTP routes used by the Exotel integration.
// ============================================================

// Express router for Exotel endpoints.
const express = require("express");

// Gets the public Exotel WebSocket stream URL.
const {
  getPublicStreamUrl,
} = require("../transports/exotel/exotelCallService");

const router = express.Router();

// Returns the public WebSocket URL used by Exotel.
router.get("/stream-url", (req, res) => {
  try {
    return res.json({
      url: getPublicStreamUrl(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;