// ============================================================
// BULK CALL PROCESSOR
// ============================================================
// Background processor for bulk dial campaigns.
// ============================================================

const BulkCall = require("../../models/BulkCall");
const Call = require("../../models/Call");
const { initiateExotelFlowCall } = require("../../transports/exotel/exotelCallService");
const { getCustomerContext } = require("../customer/customerContext");
const { createCall, updateCall } = require("../callService");
const { activeBulkProcessors, updateBulkCallProgress, updateNumberStatus } = require("./bulkCallService");

/**
 * Wait for call completion by polling Exotel or using webhook
 */
async function waitForCallCompletion(callSid, timeoutMs) {
  const startTime = Date.now();
  const pollInterval = 2000;

  return new Promise((resolve) => {
    const checkStatus = async () => {
      if (Date.now() - startTime > timeoutMs) {
        resolve({
          status: "no_answer",
          durationSeconds: 0,
          callOutcome: "no_response",
          error: "Call timeout - no answer",
        });
        return;
      }

      try {
        const call = await Call.findOne({ externalCallSid: callSid }).lean();
        if (call) {
          if (call.status === "answered" || call.status === "completed") {
            resolve({
              status: call.status,
              durationSeconds: call.durationSeconds,
              callOutcome: call.callOutcome,
            });
            return;
          }
          if (call.status === "failed") {
            resolve({
              status: "failed",
              durationSeconds: call.durationSeconds,
              callOutcome: call.callOutcome,
              error: "Call failed",
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error checking call status:", error);
      }

      setTimeout(checkStatus, pollInterval);
    };

    checkStatus();
  });
}

module.exports = { waitForCallCompletion };

/**
 * Process a single call with timeout and retry logic
 */
async function processSingleCall(bulkCall, index) {
  const numberData = bulkCall.phoneNumbers[index];
  const { normalized } = numberData;
  const { maxRetries, callTimeoutMs } = bulkCall.config;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await updateNumberStatus(bulkCall.bulkId, index, { attempts: attempt });

    try {
      const customerContext = await getCustomerContext(normalized);

      if (customerContext.doNotCall) {
        await updateNumberStatus(bulkCall.bulkId, index, {
          status: "skipped",
          error: "Customer marked as Do Not Call",
        });
        return { success: false, skipped: true };
      }

      const { randomUUID } = require("crypto");
      const callId = `CALL_${randomUUID()}`;
      const call = await createCall({
        callId,
        bulkId: bulkCall.bulkId,
        customerId: customerContext.customerId,
        phoneNumber: customerContext.phoneNumber || normalized,
        direction: "outbound",
        status: "created",
        startedAt: new Date(),
      });

      await updateNumberStatus(bulkCall.bulkId, index, {
        status: "calling",
        callId: call.callId,
        startedAt: new Date(),
      });

      const callPromise = initiateExotelFlowCall({
        phoneNumber: normalized,
        callId: call.callId,
        customerId: customerContext.customerId,
        customerName: customerContext.customerName,
        firstName: customerContext.firstName,
        previousSummary: customerContext.previousSummary,
        customerExists: customerContext.customerExists,
      });

      const result = await Promise.race([
        callPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Call initiation timeout")), callTimeoutMs)
        ),
      ]);

      await updateNumberStatus(bulkCall.bulkId, index, {
        externalCallSid: result.callSid,
      });

      await updateCall(call.callId, {
        externalCallSid: result.callSid,
        status: "initiated",
      });

      const callResult = await waitForCallCompletion(result.callSid, callTimeoutMs);

      await updateNumberStatus(bulkCall.bulkId, index, {
        status: callResult.status,
        endedAt: new Date(),
        durationSeconds: callResult.durationSeconds,
        error: callResult.error,
      });

      await updateCall(call.callId, {
        status: callResult.status,
        endedAt: new Date(),
        durationSeconds: callResult.durationSeconds,
        callOutcome: callResult.callOutcome,
      });

      return { success: true, callResult };

    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for ${normalized}:`, error.message);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, bulkCall.config.retryDelayMs));
      }
    }
  }

  await updateNumberStatus(bulkCall.bulkId, index, {
    status: "failed",
    error: lastError?.message || "Max retries exceeded",
    endedAt: new Date(),
  });

  return { success: false, error: lastError?.message };
}

/**
 * Main bulk call processor - runs in background
 */
async function processBulkCall(bulkId) {
  const bulkCall = await BulkCall.findOne({ bulkId });
  if (!bulkCall) {
    throw new Error(`Bulk call ${bulkId} not found`);
  }

  await updateBulkCallProgress(bulkId, {
    status: "running",
    startedAt: new Date(),
  });

  const processor = {
    bulkId,
    cancelled: false,
    pauseRequested: false,
  };

  activeBulkProcessors.set(bulkId, processor);

  try {
    let processedCount = 0;
    let answeredCount = 0;
    let failedCount = 0;
    let noAnswerCount = 0;

    for (let i = 0; i < bulkCall.phoneNumbers.length; i++) {
      const currentProcessor = activeBulkProcessors.get(bulkId);
      if (!currentProcessor || currentProcessor.cancelled) {
        await updateBulkCallProgress(bulkId, { status: "cancelled" });
        break;
      }

      while (currentProcessor?.pauseRequested) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updated = activeBulkProcessors.get(bulkId);
        if (!updated || updated.cancelled) break;
      }

      const numberData = bulkCall.phoneNumbers[i];

      if (numberData.status !== "pending") {
        processedCount++;
        continue;
      }

      console.log(`[Bulk ${bulkId}] Calling ${i + 1}/${bulkCall.totalNumbers}: ${numberData.normalized}`);

      const result = await processSingleCall(bulkCall, i);

      processedCount++;

      if (result.success && !result.skipped) {
        if (result.callResult?.status === "answered" || result.callResult?.status === "completed") {
          answeredCount++;
        } else if (result.callResult?.status === "no_answer") {
          noAnswerCount++;
        } else {
          failedCount++;
        }
      } else if (result.skipped) {
      } else {
        failedCount++;
      }

      await updateBulkCallProgress(bulkId, {
        processedCount,
        answeredCount,
        failedCount,
        noAnswerCount,
      });

      if (i < bulkCall.phoneNumbers.length - 1) {
        const gapMs = bulkCall.config.gapBetweenCallsMs || 5000;
        console.log(`[Bulk ${bulkId}] Waiting ${gapMs}ms before next call...`);
        await new Promise((resolve) => setTimeout(resolve, gapMs));
      }
    }

    await updateBulkCallProgress(bulkId, {
      status: "completed",
      completedAt: new Date(),
      processedCount,
      answeredCount,
      failedCount,
      noAnswerCount,
    });

    console.log(`[Bulk ${bulkId}] Completed: ${answeredCount} answered, ${noAnswerCount} no answer, ${failedCount} failed`);

  } catch (error) {
    console.error(`[Bulk ${bulkId}] Processor error:`, error);
    await updateBulkCallProgress(bulkId, {
      status: "failed",
      completedAt: new Date(),
    });
  } finally {
    activeBulkProcessors.delete(bulkId);
  }
}

/**
 * Start bulk call processing in background (non-blocking)
 */
function startBulkCallInBackground(bulkId) {
  processBulkCall(bulkId).catch((error) => {
    console.error(`Background bulk call ${bulkId} failed:`, error);
  });
}

/**
 * Pause bulk call processing
 */
function pauseBulkCall(bulkId) {
  const processor = activeBulkProcessors.get(bulkId);
  if (processor) {
    processor.pauseRequested = true;
    return true;
  }
  return false;
}

/**
 * Resume bulk call processing
 */
function resumeBulkCall(bulkId) {
  const processor = activeBulkProcessors.get(bulkId);
  if (processor) {
    processor.pauseRequested = false;
    return true;
  }
  return false;
}

/**
 * Cancel bulk call processing
 */
function cancelBulkCall(bulkId) {
  const processor = activeBulkProcessors.get(bulkId);
  if (processor) {
    processor.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Get active bulk call status
 */
function getActiveBulkStatus(bulkId) {
  const processor = activeBulkProcessors.get(bulkId);
  return processor ? { running: true, paused: processor.pauseRequested } : { running: false };
}

module.exports = {
  waitForCallCompletion,
  processSingleCall,
  processBulkCall,
  startBulkCallInBackground,
  pauseBulkCall,
  resumeBulkCall,
  cancelBulkCall,
  getActiveBulkStatus,
};
