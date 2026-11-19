// ============================================================
// ACTIVE CALL CONTEXT
// ============================================================
// Stores temporary information for the currently active call.
//
// Production note:
// This is intentionally stored in memory for the MVP.
// Later, it can be moved to Redis for multi-server scaling.
// ============================================================

const activeCallContexts = new Map();

const CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Stores context for an active call.
function setCallContext(callSid, context) {
  if (!callSid) {
    return;
  }

  activeCallContexts.set(callSid, {
    ...context,
    createdAt: Date.now(),
  });

  console.log("Call context stored:", callSid);
}

// Gets the context for an active call.
function getCallContext(callSid) {
  if (!callSid) {
    return null;
  }

  const context = activeCallContexts.get(callSid);

  if (!context) {
    return null;
  }

  // Remove stale context.
  if (Date.now() - context.createdAt > CONTEXT_TTL_MS) {
    activeCallContexts.delete(callSid);

    console.log("Expired call context removed:", callSid);

    return null;
  }

  return context;
}

// Removes the context for a call after it ends.
function removeCallContext(callSid) {
  if (!callSid) {
    return;
  }

  activeCallContexts.delete(callSid);

  console.log("Removed call context:", callSid);
}

// Checks whether context exists for a call.
function hasCallContext(callSid) {
  return Boolean(getCallContext(callSid));
}

module.exports = {
  setCallContext,
  getCallContext,
  removeCallContext,
  hasCallContext,
};
