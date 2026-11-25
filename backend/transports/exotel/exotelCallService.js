const axios = require("axios");

const {
  setCallContext,
  getCallContext,
  removeCallContext,
} = require("../../services/call/callContext");

const {
  normalizePhoneNumberForExotel,
} = require("../../services/phoneNormalizer");

// ============================================================
// EXOTEL CONFIGURATION
// ============================================================

const EXOTEL_API_KEY = process.env.EXOTEL_API_KEY;
const EXOTEL_API_TOKEN = process.env.EXOTEL_API_TOKEN;
const EXOTEL_ACCOUNT_SID = process.env.EXOTEL_ACCOUNT_SID;
const EXOTEL_CALLER_ID = process.env.EXOTEL_CALLER_ID;

const EXOTEL_API_BASE_URL =
  process.env.EXOTEL_API_BASE_URL ||
  "https://api.exotel.com";

const EXOTEL_FLOW_APP_ID =
  process.env.EXOTEL_FLOW_APP_ID;

const EXOTEL_STREAM_URL =
  process.env.EXOTEL_STREAM_URL;

const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  process.env.BACKEND_PUBLIC_URL;

// ============================================================
// VALIDATE EXOTEL CONFIGURATION
// ============================================================

function validateExotelConfig() {
  const missing = [];

  if (!EXOTEL_API_KEY) {
    missing.push("EXOTEL_API_KEY");
  }

  if (!EXOTEL_API_TOKEN) {
    missing.push("EXOTEL_API_TOKEN");
  }

  if (!EXOTEL_ACCOUNT_SID) {
    missing.push("EXOTEL_ACCOUNT_SID");
  }

  if (!EXOTEL_CALLER_ID) {
    missing.push("EXOTEL_CALLER_ID");
  }

  if (!EXOTEL_FLOW_APP_ID) {
    missing.push("EXOTEL_FLOW_APP_ID");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Exotel environment variables: ${missing.join(", ")}`,
    );
  }
}

// ============================================================
// URL HELPERS
// ============================================================

function isPlaceholderUrl(url) {
  if (!url) {
    return true;
  }

  return /YOUR-|localhost|127\.0\.0\.1/i.test(url);
}

function getPublicStreamUrl() {
  if (
    EXOTEL_STREAM_URL &&
    !isPlaceholderUrl(EXOTEL_STREAM_URL)
  ) {
    return EXOTEL_STREAM_URL;
  }

  if (
    PUBLIC_BASE_URL &&
    !isPlaceholderUrl(PUBLIC_BASE_URL)
  ) {
    const baseUrl = PUBLIC_BASE_URL.replace(/\/+$/, "");

    return `${baseUrl.replace(/^http/i, "ws")}/exotel-stream`;
  }

  throw new Error(
    "EXOTEL_STREAM_URL must be a public wss:// URL such as wss://your-ngrok-domain/exotel-stream. The current value is missing, localhost, or a placeholder.",
  );
}

// ============================================================
// NORMALIZE PHONE NUMBER FOR EXOTEL
// ============================================================
//
// Customer-to-App flow uses:
//
// 10 digit number:
// 8197983277
//
// becomes:
//
// 08197983277
//
// ============================================================

function normalizePhoneNumber(phoneNumber) {
  return normalizePhoneNumberForExotel(phoneNumber);
}

// ============================================================
// EXTRACT XML VALUE
// ============================================================

function extractXmlValue(xml, tagName) {
  if (!xml) {
    return null;
  }

  const regex = new RegExp(
    `<${tagName}>(.*?)</${tagName}>`,
    "i",
  );

  const match = String(xml).match(regex);

  return match ? match[1] : null;
}
// ============================================================
// INITIATE OUTBOUND FLOW CALL
// ============================================================

async function initiateExotelFlowCall({
  phoneNumber,
  customerId = null,
  customerName = null,
  firstName = null,
  previousSummary = null,
  customerExists = false,
  callId = null,
}) {
  validateExotelConfig();

  // ----------------------------------------------------------
  // NORMALIZE CUSTOMER NUMBER
  // ----------------------------------------------------------

  const customerPhoneNumber =
    normalizePhoneNumber(phoneNumber);

  // ----------------------------------------------------------
  // EXOTEL FLOW URL
  // ----------------------------------------------------------
  //
  // This Flow contains your Voicebot Applet.
  // The Voicebot Applet is responsible for opening:
  //
  // wss://.../exotel-stream
  //
  // ----------------------------------------------------------

  const flowUrl =
    `http://my.exotel.in/exoml/start/${EXOTEL_FLOW_APP_ID}`;

  // ----------------------------------------------------------
  // OPTIONAL STREAM URL
  // ----------------------------------------------------------
  //
  // We keep this only for logging/debugging.
  // It is NOT sent to Calls/connect.
  //
  // The Voicebot Applet inside the Exotel Flow owns the
  // WebSocket configuration.
  // ----------------------------------------------------------

  let streamUrl = null;

  try {
    streamUrl = getPublicStreamUrl();
  } catch (error) {
    console.warn(
      "Public stream URL could not be resolved:",
      error.message,
    );
  }

  // ----------------------------------------------------------
  // EXOTEL REQUEST PARAMETERS
  // ----------------------------------------------------------
  //
  // Important:
  //
  // From      = Customer
  // CallerId  = Exotel number
  // CallType  = trans
  // Url       = Exotel Flow
  //
  // We intentionally DO NOT send:
  //
  // streamurl
  // streamtype
  //
  // ----------------------------------------------------------

  const params = new URLSearchParams();

  params.append(
    "From",
    customerPhoneNumber,
  );

  params.append(
    "CallerId",
    EXOTEL_CALLER_ID,
  );

  params.append(
    "CallType",
    "trans",
  );

  params.append(
    "Url",
    flowUrl,
  );

  // ----------------------------------------------------------
  // CUSTOMER ID
  // ----------------------------------------------------------
  //
  // CustomField is carried by Exotel into the call flow
  // and can also be used for debugging/context.
  //
  // ----------------------------------------------------------

  if (customerId) {
    params.append(
      "CustomField",
      customerId,
    );
  }

  // ----------------------------------------------------------
  // LOG OUTBOUND CALL
  // ----------------------------------------------------------

  console.log("");
  console.log("========================================");
  console.log("EXOTEL OUTBOUND CALL");
  console.log("========================================");

  console.log(
    "Customer:",
    customerPhoneNumber,
  );

  console.log(
    "Customer ID:",
    customerId || "New customer",
  );

  console.log(
    "Customer Name:",
    customerName || "Unknown",
  );

  console.log(
    "First Name:",
    firstName || "Unknown",
  );

  console.log(
    "Previous Summary:",
    previousSummary
      ? "Available"
      : "None",
  );

  console.log(
    "Customer Exists:",
    customerExists,
  );

  console.log(
    "Internal Call ID:",
    callId || "Not provided",
  );

  console.log(
    "Caller ID:",
    EXOTEL_CALLER_ID,
  );

  console.log(
    "Flow App ID:",
    EXOTEL_FLOW_APP_ID,
  );

  console.log(
    "Flow URL:",
    flowUrl,
  );

  console.log(
    "Configured Stream URL:",
    streamUrl || "Not available",
  );

  console.log(
    "Stream URL sent to Calls/connect:",
    "NO - Voicebot Flow handles streaming",
  );

  console.log("========================================");
  console.log("");

  // ----------------------------------------------------------
  // EXOTEL CALLS/CONNECT ENDPOINT
  // ----------------------------------------------------------

  const apiUrl =
    `${EXOTEL_API_BASE_URL}/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls/connect`;

  try {
    const response = await axios.post(
      apiUrl,
      params.toString(),
      {
        auth: {
          username: EXOTEL_API_KEY,
          password: EXOTEL_API_TOKEN,
        },

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        timeout: 30000,
      },
    );

    // --------------------------------------------------------
    // EXTRACT CALL SID
    // --------------------------------------------------------

    const callSid =
      extractXmlValue(
        response.data,
        "Sid",
      );

    // --------------------------------------------------------
    // LOG EXOTEL RESPONSE
    // --------------------------------------------------------

    console.log("");
    console.log("========================================");
    console.log("EXOTEL RESPONSE");
    console.log("========================================");

    console.log(
      response.data,
    );

    console.log(
      "Call SID:",
      callSid || "Not returned",
    );

    console.log(
      "HTTP Status:",
      response.status,
    );

    console.log("========================================");
    console.log("");

    // --------------------------------------------------------
    // STORE CALL CONTEXT
    // --------------------------------------------------------

    if (callSid) {
      setCallContext(
        callSid,
        {
          callId,
          customerId,
          customerName,
          firstName,
          previousSummary,
          customerExists,
          phoneNumber: customerPhoneNumber,
        },
      );

      console.log(
        "Call context stored:",
        callSid,
      );
    } else {
      console.warn(
        "Exotel returned no Call SID. Call context was not stored.",
      );
    }

    // --------------------------------------------------------
    // RETURN RESULT
    // --------------------------------------------------------

    return {
      success: true,

      callSid,

      customerPhoneNumber,

      customerId,

      customerName,

      firstName,

      customerExists,

      callId,

      flowUrl,

      streamUrl,

      response: response.data,
    };
      } catch (error) {
    // --------------------------------------------------------
    // EXOTEL ERROR DETAILS
    // --------------------------------------------------------

    const exotelError =
      error.response?.data ||
      error.message;

    const statusCode =
      error.response?.status || null;

    console.error("");
    console.error("========================================");
    console.error("EXOTEL OUTBOUND CALL FAILED");
    console.error("========================================");

    console.error(
      "HTTP Status:",
      statusCode || "Unknown",
    );

    console.error(
      "Customer:",
      customerPhoneNumber,
    );

    console.error(
      "Flow URL:",
      flowUrl,
    );

    console.error(
      "Error:",
      exotelError,
    );

    console.error("========================================");
    console.error("");

    throw error;
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  initiateExotelFlowCall,
  normalizePhoneNumber,
  getPublicStreamUrl,

  // Keep these exports because other modules already
  // use the call context helpers from this service.
  getCallContext,
  setCallContext,
  removeCallContext,
};