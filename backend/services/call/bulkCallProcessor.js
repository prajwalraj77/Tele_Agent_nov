// ============================================================
// BULK CALL PROCESSOR
// ============================================================
// Executes outbound bulk campaigns sequentially.
//
// HARD RULE:
//
// Call N
//   ↓
// Call disconnects
//   ↓
// Call N is finalized
//   ↓
// MongoDB persistence is verified
//   ↓
// wait exactly 20 seconds
//   ↓
// Call N + 1
//
// If MongoDB persistence fails:
//
// STOP CAMPAIGN
// DO NOT START NEXT CALL
// ============================================================

const {
  randomUUID,
} = require("crypto");

const BulkCall =
  require("../../models/BulkCall");

const Call =
  require("../../models/Call");

const {
  initiateExotelFlowCall,
} = require(
  "../../transports/exotel/exotelCallService",
);

const {
  getCustomerContext,
} = require(
  "../customer/customerContext",
);

const {
  createCall,
  updateCall,
} = require(
  "../callService",
);

const {
  activeBulkProcessors,
  updateBulkCallProgress,
  updateNumberStatus,
} = require(
  "./bulkCallService",
);

// ============================================================
// SMALL DELAY HELPER
// ============================================================

function sleep(
  milliseconds,
) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

// ============================================================
// WAIT FOR FINAL CALL STATE
// ============================================================
//
// IMPORTANT:
//
// "answered" is NOT considered complete.
//
// The call may still be actively connected.
//
// We wait for:
//
// completed
// failed
// no_answer
//
// The normal Exotel flow should reach "completed" when
// callFinalizer finishes.
//
// ============================================================

async function waitForCallCompletion(
  callId,
  callSid,
  timeoutMs,
) {
  const startedWaitingAt =
    Date.now();

  const pollIntervalMs =
    2000;

  while (true) {
    const elapsed =
      Date.now() -
      startedWaitingAt;

    if (
      elapsed >=
      timeoutMs
    ) {
      throw new Error(
        `Active call did not reach a final state within ${timeoutMs}ms.`,
      );
    }

    let call;

    try {
      if (callId) {
        call =
          await Call
            .findOne({
              callId,
            })
            .lean();
      } else if (
        callSid
      ) {
        call =
          await Call
            .findOne({
              externalCallSid:
                callSid,
            })
            .lean();
      }
    } catch (error) {
      // A temporary read failure is not a reason
      // to start another call.
      //
      // We keep polling until the safety timeout.
      console.error(
        "Unable to read current Call from MongoDB:",
        error.message,
      );

      await sleep(
        pollIntervalMs,
      );

      continue;
    }

    if (!call) {
      await sleep(
        pollIntervalMs,
      );

      continue;
    }

    console.log(
      `[Bulk] Call ${call.callId} current status: ${call.status}`,
    );

    // --------------------------------------------------------
    // FINAL SUCCESS STATE
    // --------------------------------------------------------

    if (
      call.status ===
      "completed"
    ) {
      return call;
    }

    // --------------------------------------------------------
    // FINAL NO-ANSWER STATE
    // --------------------------------------------------------

    if (
      call.status ===
      "no_answer"
    ) {
      return call;
    }

    // --------------------------------------------------------
    // FINAL FAILURE STATE
    // --------------------------------------------------------

    if (
      call.status ===
      "failed"
    ) {
      return call;
    }

    // --------------------------------------------------------
    // answered / initiated / ringing / created
    //
    // These are NOT final.
    // --------------------------------------------------------

    await sleep(
      pollIntervalMs,
    );
  }
}

// ============================================================
// VERIFY FINALIZED CALL PERSISTENCE
// ============================================================
//
// This is the HARD GATE.
//
// We do not trust an in-memory result.
//
// We read the finalized Call back from MongoDB.
//
// Required:
// - record exists
// - status is final
// - endedAt exists
// - duration exists
//
// summaryStatus can be "completed" OR "failed" because
// Gemini enrichment is secondary to preserving the actual
// phone-call record.
//
// ============================================================

async function verifyFinalizedCallPersistence(
  callId,
) {
  if (!callId) {
    throw new Error(
      "Cannot verify finalized call: callId is missing.",
    );
  }

  const persistedCall =
    await Call.findOne({
      callId,
    }).lean();

  if (!persistedCall) {
    throw new Error(
      "Unable to persist completed call data to MongoDB: Call record was not found after finalization.",
    );
  }

  if (
    ![
      "completed",
      "no_answer",
      "failed",
    ].includes(
      persistedCall.status,
    )
  ) {
    throw new Error(
      `Unable to persist completed call data to MongoDB: Call is still in non-final state "${persistedCall.status}".`,
    );
  }

  if (
    !persistedCall.endedAt
  ) {
    throw new Error(
      "Unable to persist completed call data to MongoDB: endedAt is missing.",
    );
  }

  if (
    typeof persistedCall.durationSeconds !==
      "number" ||
    persistedCall.durationSeconds <
      0
  ) {
    throw new Error(
      "Unable to persist completed call data to MongoDB: durationSeconds is invalid.",
    );
  }

  return persistedCall;
}

// ============================================================
// PROCESS ONE CALL
// ============================================================

async function processSingleCall(
  bulkId,
  index,
) {
  const bulkCall =
    await BulkCall.findOne({
      bulkId,
    });

  if (!bulkCall) {
    throw new Error(
      `Bulk campaign ${bulkId} was not found.`,
    );
  }

  const numberData =
    bulkCall.phoneNumbers[
      index
    ];

  if (!numberData) {
    throw new Error(
      `Phone number at index ${index} was not found.`,
    );
  }

  const normalized =
    numberData.normalized;

  const maxRetries =
    bulkCall.config
      ?.maxRetries ||
    1;

  const retryDelayMs =
    bulkCall.config
      ?.retryDelayMs ||
    5000;

  const callTimeoutMs =
    bulkCall.config
      ?.callTimeoutMs ||
    600000;

  let lastError =
    null;

  // ==========================================================
  // RETRY LOOP
  // ==========================================================

  for (
    let attempt = 1;
    attempt <=
      maxRetries;
    attempt++
  ) {
    let callId =
      null;

    try {
      await updateNumberStatus(
        bulkId,
        index,
        {
          status:
            "calling",

          attempts:
            attempt,

          error:
            null,

          startedAt:
            new Date(),
        },
      );

      await updateBulkCallProgress(
        bulkId,
        {
          currentIndex:
            index,
          currentCallId:
            null,
          currentExternalCallSid:
            null,
        },
      );

      // ------------------------------------------------------
      // CUSTOMER CONTEXT
      // ------------------------------------------------------

      const customerContext =
        await getCustomerContext(
          normalized,
        );

      if (
        customerContext.doNotCall
      ) {
        await updateNumberStatus(
          bulkId,
          index,
          {
            status:
              "skipped",

            error:
              "Customer is marked as Do Not Call.",
          },
        );

        return {
          success:
            true,

          skipped:
            true,
        };
      }

      // ------------------------------------------------------
      // CREATE UNIVERSAL CALL RECORD
      // ------------------------------------------------------

      callId =
        `CALL_${randomUUID()}`;

      const call =
        await createCall({
          callId,

          bulkId,

          customerId:
            customerContext.customerId,

          phoneNumber:
            customerContext.phoneNumber ||
            normalized,

          direction:
            "outbound",

          status:
            "created",

          startedAt:
            new Date(),

          summary:
            null,

          language:
            null,

          interestStatus:
            null,

          followUpRequired:
            false,

          followUpDate:
            null,

          followUpAt:
            null,

          callbackStatus:
            null,

          callbackReason:
            null,

          nextAction:
            null,

          summaryStatus:
            "pending",
        });

      // ------------------------------------------------------
      // SAVE CURRENT CALL AS CAMPAIGN CALL
      // ------------------------------------------------------

      await updateNumberStatus(
        bulkId,
        index,
        {
          status:
            "calling",

          callId:
            call.callId,

          startedAt:
            call.startedAt,
        },
      );

      await updateBulkCallProgress(
        bulkId,
        {
          currentIndex:
            index,

          currentCallId:
            call.callId,
        },
      );

      console.log("");
      console.log(
        "========================================",
      );
      console.log(
        `[Bulk ${bulkId}] STARTING CALL ${index + 1}/${bulkCall.totalNumbers}`,
      );
      console.log(
        "========================================",
      );

      console.log(
        "Phone:",
        normalized,
      );

      console.log(
        "Call ID:",
        call.callId,
      );

      // ------------------------------------------------------
      // START EXOTEL CALL
      // ------------------------------------------------------

      let result;

      try {
        result =
          await initiateExotelFlowCall({
            phoneNumber:
              normalized,

            callId:
              call.callId,

            customerId:
              customerContext.customerId,

            customerName:
              customerContext.customerName,

            firstName:
              customerContext.firstName,

            previousSummary:
              customerContext.previousSummary,

            customerExists:
              customerContext.customerExists,
          });
      } catch (
        initiationError
      ) {
        throw new Error(
          `Exotel call initiation failed: ${initiationError.message}`,
        );
      }

      if (
        !result?.callSid
      ) {
        throw new Error(
          "Exotel did not return a call SID.",
        );
      }

      // ------------------------------------------------------
      // SAVE EXOTEL SID
      // ------------------------------------------------------

      await updateCall(
        call.callId,
        {
          externalCallSid:
            result.callSid,

          status:
            "initiated",
        },
      );

      await updateNumberStatus(
        bulkId,
        index,
        {
          externalCallSid:
            result.callSid,
        },
      );

      await updateBulkCallProgress(
        bulkId,
        {
          currentCallId:
            call.callId,

          currentExternalCallSid:
            result.callSid,
        },
      );

      console.log(
        `[Bulk ${bulkId}] Exotel SID: ${result.callSid}`,
      );

      // ======================================================
      // CRITICAL SECTION
      // ======================================================
      //
      // We now WAIT until the current call reaches a final
      // persisted state.
      //
      // answered != completed
      //
      // Therefore the next call cannot start while this
      // call is still connected.
      // ======================================================

      const finalizedCall =
        await waitForCallCompletion(
          call.callId,
          result.callSid,
          callTimeoutMs,
        );

      // ======================================================
      // HARD MONGODB PERSISTENCE GATE
      // ======================================================

      const persistedCall =
        await verifyFinalizedCallPersistence(
          call.callId,
        );

      console.log("");
      console.log(
        "========================================",
      );
      console.log(
        `[Bulk ${bulkId}] CALL DATA PERSISTED`,
      );
      console.log(
        "========================================",
      );

      console.log(
        "Call ID:",
        persistedCall.callId,
      );

      console.log(
        "Status:",
        persistedCall.status,
      );

      console.log(
        "Ended:",
        persistedCall.endedAt,
      );

      console.log(
        "Duration:",
        persistedCall.durationSeconds,
        "seconds",
      );

      // ------------------------------------------------------
      // UPDATE CAMPAIGN NUMBER
      // ------------------------------------------------------

      await updateNumberStatus(
        bulkId,
        index,
        {
          status:
            persistedCall.status ===
            "no_answer"
              ? "no_answer"
              : persistedCall.status ===
                  "failed"
                ? "failed"
                : "completed",

          callId:
            persistedCall.callId,

          externalCallSid:
            persistedCall.externalCallSid ||
            result.callSid,

          endedAt:
            persistedCall.endedAt,

          durationSeconds:
            persistedCall.durationSeconds,

          error:
            null,
        },
      );

      // ------------------------------------------------------
      // IMPORTANT:
      //
      // The Call record has now been verified in MongoDB.
      //
      // Only now can we consider this number processed.
      // ------------------------------------------------------

      await updateBulkCallProgress(
        bulkId,
        {
          currentIndex:
            index,

          currentCallId:
            null,

          currentExternalCallSid:
            null,

          lastPersistedCallId:
            persistedCall.callId,
        },
      );

      return {
        success:
          true,

        skipped:
          false,

        callResult:
          persistedCall,
      };
    } catch (
      error
    ) {
      lastError =
        error;

      console.error("");
      console.error(
        "========================================",
      );
      console.error(
        `[Bulk ${bulkId}] CALL FAILED`,
      );
      console.error(
        "========================================",
      );

      console.error(
        "Phone:",
        normalized,
      );

      console.error(
        "Attempt:",
        attempt,
      );

      console.error(
        "Error:",
        error.message,
      );

      // ------------------------------------------------------
      // CRITICAL RULE:
      //
      // If the current call was already started and we cannot
      // prove that its final data was persisted, we MUST NOT
      // start another call.
      //
      // This is the exact safety requirement.
      // ------------------------------------------------------

      if (
        callId
      ) {
        try {
          await updateNumberStatus(
            bulkId,
            index,
            {
              status:
                "failed",

              error:
                error.message,

              endedAt:
                new Date(),
            },
          );
        } catch (
          numberUpdateError
        ) {
          console.error(
            "Unable to update failed phone-number state:",
            numberUpdateError.message,
          );
        }
      }

      // ------------------------------------------------------
      // DO NOT RETRY PERSISTENCE FAILURE
      // ------------------------------------------------------
      //
      // Retrying the phone call here could create duplicate
      // calls while the previous call's data is uncertain.
      //
      // Campaign stops instead.
      // ------------------------------------------------------

      const isPersistenceGateFailure =
        error.message.includes(
          "Unable to persist completed call data to MongoDB",
        ) ||
        error.message.includes(
          "did not reach a final state",
        );

      if (
        isPersistenceGateFailure
      ) {
        throw error;
      }

      // If Exotel failed before a usable active call existed,
      // retry according to campaign configuration.
      if (
        attempt <
        maxRetries
      ) {
        console.log(
          `[Bulk ${bulkId}] Retrying in ${retryDelayMs}ms...`,
        );

        await sleep(
          retryDelayMs,
        );

        continue;
      }

      throw error;
    }
  }

  throw new Error(
    lastError?.message ||
      "Call failed.",
  );
}

// ============================================================
// MAIN CAMPAIGN PROCESSOR
// ============================================================

async function processBulkCall(
  bulkId,
) {
  const bulkCall =
    await BulkCall.findOne({
      bulkId,
    });

  if (!bulkCall) {
    throw new Error(
      `Bulk campaign ${bulkId} not found.`,
    );
  }

  const gapBetweenCallsMs =
    Math.max(
      bulkCall.config?.gapBetweenCallsMs ||
        20000,
      20000,
    );

  // ----------------------------------------------------------
  // PREVENT DUPLICATE PROCESSORS
  // ----------------------------------------------------------

  if (
    activeBulkProcessors.has(
      bulkId,
    )
  ) {
    throw new Error(
      `Bulk campaign ${bulkId} is already running.`,
    );
  }

  const processor = {
    bulkId,

    cancelled:
      false,

    pauseRequested:
      false,
  };

  activeBulkProcessors.set(
    bulkId,
    processor,
  );

  let processedCount =
    bulkCall.processedCount ||
    0;

  let answeredCount =
    bulkCall.answeredCount ||
    0;

  let failedCount =
    bulkCall.failedCount ||
    0;

  let noAnswerCount =
    bulkCall.noAnswerCount ||
    0;

  try {
    await updateBulkCallProgress(
      bulkId,
      {
        status:
          "running",

        startedAt:
          bulkCall.startedAt ||
          new Date(),

        failureReason:
          null,

        lastError:
          null,
      },
    );

    // ========================================================
    // SEQUENTIAL LOOP
    // ========================================================

    for (
      let index = 0;
      index <
        bulkCall.phoneNumbers.length;
      index++
    ) {
      const currentProcessor =
        activeBulkProcessors.get(
          bulkId,
        );

      if (
        !currentProcessor ||
        currentProcessor.cancelled
      ) {
        await updateBulkCallProgress(
          bulkId,
          {
            status:
              "cancelled",

            completedAt:
              new Date(),

            currentCallId:
              null,

            currentExternalCallSid:
              null,
          },
        );

        return;
      }

      // ------------------------------------------------------
      // PAUSE
      // ------------------------------------------------------

      while (
        currentProcessor.pauseRequested
      ) {
        await sleep(
          1000,
        );

        const refreshed =
          activeBulkProcessors.get(
            bulkId,
          );

        if (
          !refreshed ||
          refreshed.cancelled
        ) {
          break;
        }
      }

      const refreshedProcessor =
        activeBulkProcessors.get(
          bulkId,
        );

      if (
        !refreshedProcessor ||
        refreshedProcessor.cancelled
      ) {
        await updateBulkCallProgress(
          bulkId,
          {
            status:
              "cancelled",

            completedAt:
              new Date(),
          },
        );

        return;
      }

      const numberData =
        bulkCall.phoneNumbers[
          index
        ];

      if (
        numberData.status !==
        "pending"
      ) {
        continue;
      }

      console.log("");
      console.log(
        "########################################",
      );
      console.log(
        `[Bulk ${bulkId}] PROCESSING ${index + 1}/${bulkCall.totalNumbers}`,
      );
      console.log(
        "########################################",
      );

      let result;

      try {
        result =
          await processSingleCall(
            bulkId,
            index,
          );
      } catch (
        error
      ) {
        // ====================================================
        // HARD STOP
        // ====================================================
        //
        // Current call could not be safely finalized/persisted.
        //
        // NEVER continue to the next phone number.
        // ====================================================

        failedCount++;

        await updateBulkCallProgress(
          bulkId,
          {
            status:
              "failed",

            failureReason:
              "Unable to persist completed call data to MongoDB.",

            lastError:
              error.message,

            currentCallId:
              null,

            currentExternalCallSid:
              null,

            processedCount,

            answeredCount,

            failedCount,

            noAnswerCount,

            completedAt:
              new Date(),
          },
        );

        console.error("");
        console.error(
          "########################################",
        );
        console.error(
          `[Bulk ${bulkId}] CAMPAIGN STOPPED`,
        );
        console.error(
          "########################################",
        );

        console.error(
          "Reason: Unable to persist completed call data to MongoDB.",
        );

        console.error(
          "Details:",
          error.message,
        );

        return;
      }

      // ------------------------------------------------------
      // SUCCESSFUL CALL PROCESSING
      // ------------------------------------------------------

      processedCount++;

      const callResult =
        result.callResult;

      if (
        result.skipped
      ) {
        // Do not count skipped as answered.
      } else if (
        callResult?.status ===
          "no_answer" ||
        callResult?.callOutcome ===
          "no_response"
      ) {
        noAnswerCount++;
      } else if (
        callResult?.status ===
          "completed"
      ) {
        answeredCount++;
      } else if (
        callResult?.status ===
          "failed"
      ) {
        failedCount++;
      }

      await updateBulkCallProgress(
        bulkId,
        {
          processedCount,

          answeredCount,

          failedCount,

          noAnswerCount,

          currentCallId:
            null,

          currentExternalCallSid:
            null,

          lastPersistedCallId:
            callResult?.callId ||
            null,
        },
      );

      // ======================================================
      // 20-SECOND GAP
      // ======================================================
      //
      // This happens ONLY after the current call has been
      // finalized AND MongoDB persistence has been verified.
      //
      // No call can start during this period.
      // ======================================================

      if (
        index <
        bulkCall.phoneNumbers.length -
          1
      ) {
        const gapMs =
          gapBetweenCallsMs;

        console.log("");
        console.log(
          `[Bulk ${bulkId}] Current call fully persisted.`,
        );

        console.log(
          `[Bulk ${bulkId}] Waiting exactly ${gapMs}ms before next call...`,
        );

        await sleep(
          gapMs,
        );

        console.log(
          `[Bulk ${bulkId}] 20-second gap completed.`,
        );
      }
    }

    // ========================================================
    // CAMPAIGN COMPLETE
    // ========================================================

    await updateBulkCallProgress(
      bulkId,
      {
        status:
          "completed",

        processedCount,

        answeredCount,

        failedCount,

        noAnswerCount,

        currentIndex:
          -1,

        currentCallId:
          null,

        currentExternalCallSid:
          null,

        completedAt:
          new Date(),

        failureReason:
          null,

        lastError:
          null,
      },
    );

    console.log("");
    console.log(
      "########################################",
    );
    console.log(
      `[Bulk ${bulkId}] CAMPAIGN COMPLETED`,
    );
    console.log(
      "########################################",
    );
  } catch (
    error
  ) {
    console.error(
      `[Bulk ${bulkId}] Unexpected processor error:`,
      error,
    );

    await updateBulkCallProgress(
      bulkId,
      {
        status:
          "failed",

        failureReason:
          "Bulk campaign processor failed.",

        lastError:
          error.message,

        completedAt:
          new Date(),

        currentCallId:
          null,

        currentExternalCallSid:
          null,
      },
    );

    throw error;
  } finally {
    activeBulkProcessors.delete(
      bulkId,
    );
  }
}

// ============================================================
// START IN BACKGROUND
// ============================================================

function startBulkCallInBackground(
  bulkId,
) {
  processBulkCall(
    bulkId,
  ).catch(
    (error) => {
      console.error(
        `Background bulk campaign ${bulkId} failed:`,
        error,
      );
    },
  );
}

// ============================================================
// PAUSE
// ============================================================

function pauseBulkCall(
  bulkId,
) {
  const processor =
    activeBulkProcessors.get(
      bulkId,
    );

  if (
    !processor
  ) {
    return false;
  }

  processor.pauseRequested =
    true;

  return true;
}

// ============================================================
// RESUME
// ============================================================

function resumeBulkCall(
  bulkId,
) {
  const processor =
    activeBulkProcessors.get(
      bulkId,
    );

  if (
    !processor
  ) {
    return false;
  }

  processor.pauseRequested =
    false;

  return true;
}

// ============================================================
// CANCEL
// ============================================================

function cancelBulkCall(
  bulkId,
) {
  const processor =
    activeBulkProcessors.get(
      bulkId,
    );

  if (
    !processor
  ) {
    return false;
  }

  processor.cancelled =
    true;

  return true;
}

// ============================================================
// ACTIVE STATUS
// ============================================================

function getActiveBulkStatus(
  bulkId,
) {
  const processor =
    activeBulkProcessors.get(
      bulkId,
    );

  if (!processor) {
    return {
      running:
        false,
    };
  }

  return {
    running:
      true,

    paused:
      Boolean(
        processor.pauseRequested,
      ),

    cancelled:
      Boolean(
        processor.cancelled,
      ),
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports =
  {
    waitForCallCompletion,
    verifyFinalizedCallPersistence,
    processSingleCall,
    processBulkCall,
    startBulkCallInBackground,
    pauseBulkCall,
    resumeBulkCall,
    cancelBulkCall,
    getActiveBulkStatus,
  };