// ============================================================
// PHONE NUMBER NORMALIZATION UTILITY
// ============================================================
// Single reusable phone-number normalization utility.
// Accepts various Indian phone formats and returns canonical
// +91XXXXXXXXXX format.
//
// Accepted inputs:
//   9187715069          -> +919187715069
//   09187715069         -> +919187715069
//   +919187715069       -> +919187715069
//   +91 9187715069      -> +919187715069
//   91-9187715069       -> +919187715069
//   87715069            -> null (too short)
//   invalid             -> null
//
// Returns null for invalid numbers instead of throwing,
// so callers can decide how to handle invalid input.
// ============================================================

function normalizePhoneNumber(phone) {
  if (!phone) {
    return null;
  }

  // Convert to string and strip all non-digit characters except +
  let normalized = String(phone).trim();
  normalized = normalized.replace(/[^\d+]/g, "");

  // Remove leading + if present
  const hasPlus = normalized.startsWith("+");
  if (hasPlus) {
    normalized = normalized.slice(1);
  }

  // Remove leading 91 (country code) if present
  if (normalized.startsWith("91") && normalized.length === 12) {
    normalized = normalized.slice(2);
  }

  // Remove leading 0 if present
  if (normalized.startsWith("0") && normalized.length === 11) {
    normalized = normalized.slice(1);
  }

  // Validate: must be exactly 10 digits
  if (!/^\d{10}$/.test(normalized)) {
    return null;
  }

  return `+91${normalized}`;
}

module.exports = {
  normalizePhoneNumber,
};

/**
 * Converts a canonical +91XXXXXXXXXX number to Exotel API format (0XXXXXXXXXX).
 * Returns null if input is invalid.
 */
function normalizePhoneNumberForExotel(phone) {
  const canonical = normalizePhoneNumber(phone);
  if (!canonical) {
    return null;
  }
  // canonical is +91XXXXXXXXXX, convert to 0XXXXXXXXXX
  return `0${canonical.slice(3)}`;
}

module.exports.normalizePhoneNumberForExotel = normalizePhoneNumberForExotel;