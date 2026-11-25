// ============================================================
// BULK CALL NORMALIZER
// ============================================================
// Import processing: normalization, validation, deduplication.
// Reuses shared phoneNormalizer to avoid duplicate logic.
// ============================================================

const { normalizePhoneNumber } = require("../phoneNormalizer");

// Result shapes:
//   { valid: [{ original, normalized }], invalid: [{ original, reason }] }

function normalizeAndDedup(rawNumbers) {
  if (!rawNumbers || !Array.isArray(rawNumbers)) {
    return { valid: [], invalid: [] };
  }

  const seen = new Set();
  const valid = [];
  const invalid = [];

  for (const raw of rawNumbers) {
    if (!raw || typeof raw !== "string") {
      invalid.push({ original: String(raw), reason: "Empty or invalid input" });
      continue;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      invalid.push({ original: raw, reason: "Empty number" });
      continue;
    }

    const normalized = normalizePhoneNumber(trimmed);

    if (!normalized) {
      invalid.push({ original: trimmed, reason: "Invalid Indian mobile number" });
      continue;
    }

    // Deduplicate within same import
    if (seen.has(normalized)) {
      invalid.push({ original: trimmed, reason: "Duplicate number in upload" });
      continue;
    }

    seen.add(normalized);
    valid.push({ original: trimmed, normalized });
  }

  return { valid, invalid };
}

module.exports = {
  normalizeAndDedup,
};