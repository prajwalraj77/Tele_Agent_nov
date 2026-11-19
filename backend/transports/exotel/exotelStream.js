// ============================================================
// EXOTEL STREAM
// ============================================================
// Main Exotel WebSocket entry point.
// ============================================================

const {
  createTranscript,
} = require("../../services/call/callTranscript");

const {
  updateCall,
  updateCallByExternalSid,
} = require("../../services/callService");

const {
  getExotelCallSid,
  createExotelClient,
} = require("./exotelClient");

const {
  createExotelAudio,
} = require("./exotelAudio");

const {
  createExotelCallManager,
} = require("./exotelCall");

const {
  getCallContext,
} = require("../../services/call/callContext");

const {
  buildNoResponseReminderPrompt,
} = require("../../services/gemini/geminiPrompts");

const VALID_CLOSURE_OUTCOMES = [
  "callback_requested",
  "demo_visit_confirmed",
  "not_interested",
];

// Handles one Exotel WebSocket connection.
async function handleExotelConnection(
  ws,
  request,
) {
  const url = new URL(
    request.url,
    `http://${request.headers.host}`,
  );

  console.log("");
  console.log(
    "=================================",
  );
  console.log(
    "EXOTEL WEBSOCKET CONNECTED",
  );
  console.log(
    "=================================",
  );

  const state = {
    voiceAgent: null,
    voiceAgentPromise: null,

    callContextPromise: null,

    streamSid: null,

    callSid:
      getExotelCallSid(
        null,
        url,
      ),

    callContext: null,
    internalCallId: null,

    callFinalized: false,
    finalizingCall: false,

    callOutcome: null,
    callClosureRequested: false,

    conversation:
      createTranscript(),

    outputPcmBuffer:
      Buffer.alloc(0),

    pendingAudio: [],
    audioQueue: [],

    audioPlaybackTimer: null,

    totalQueuedBytes: 0,
    audioChunksSent: 0,

    aiCurrentlySpeaking: false,

    geminiAudioEnabled: true,

    exotelSampleRate: 16000,

    MIN_EXOTEL_CHUNK_BYTES: 3200,

    chunkSize: 3200,

    playbackChunkDurationMs: 100,

    geminiToExotelResampler: null,

    pendingCustomerAudio: [],

    SPEECH_RMS_THRESHOLD: 0.07,

    REQUIRED_SPEECH_FRAMES: 2,

    INTERRUPTION_COOLDOWN_MS: 700,

    CUSTOMER_SPEECH_COOLDOWN_MS: 700,

    speechFrameCount: 0,

    lastCustomerSpeechDetectionTime: 0,

    lastInterruptionTime: 0,

    interruptionTriggered: false,

    audioGeneration: 0,

    responseGeneration: 0,

    callStartedAt:
      Date.now(),

    firstCustomerAudioAt:
      null,

    firstGeminiAudioAt:
      null,

    firstExotelAudioAt:
      null,

    noResponseTimer:
      null,

    noResponseActive:
      false,

    noResponseStartedAt:
      null,

    noResponseReminderCount:
      0,

    lastNoResponseReminder:
      null,

    noResponseSequenceId:
      0,

    noResponseDisconnecting:
      false,

    intentionalClosureTimer:
      null,

    intentionalClosureSequenceId:
      0,

    intentionalClosureDisconnecting:
      false,

    NO_RESPONSE_REMINDER_MS:
      5000,

    NO_RESPONSE_REMINDER_COUNT:
      3,

    NO_RESPONSE_DISCONNECT_MS:
      18000,

    INTENTIONAL_CLOSURE_DELAY_MS:
      2000,

    INTENTIONAL_CLOSURE_FALLBACK_MS:
      7000,
  };

  state.callContext =
    state.callSid
      ? getCallContext(
          state.callSid,
        )
      : null;

  state.internalCallId =
    state.callContext?.callId ||
    null;

  function clearNoResponseTimer() {
    if (state.noResponseTimer) {
      clearTimeout(
        state.noResponseTimer,
      );

      state.noResponseTimer =
        null;
    }
  }

  function stopNoResponseMonitoring() {
    state.noResponseSequenceId++;

    clearNoResponseTimer();

    state.noResponseActive =
      false;

    state.noResponseStartedAt =
      null;

    state.noResponseReminderCount =
      0;

    state.lastNoResponseReminder =
      null;
  }

  function clearIntentionalClosureTimer() {
    if (
      state.intentionalClosureTimer
    ) {
      clearTimeout(
        state.intentionalClosureTimer,
      );

      state.intentionalClosureTimer =
        null;
    }
  }

  async function disconnectForNoResponse() {
    if (
      state.noResponseDisconnecting ||
      state.callFinalized ||
      state.callClosureRequested
    ) {
      return;
    }

    state.noResponseDisconnecting =
      true;

    state.callOutcome =
      "no_response";

    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "CUSTOMER NO RESPONSE - DISCONNECTING",
    );
    console.log(
      "=================================",
    );

    stopNoResponseMonitoring();

    state.geminiAudioEnabled =
      false;

    audio.clearLocalAudio();

    if (state.voiceAgent) {
      state.voiceAgent.close();
      state.voiceAgent = null;
    }

    try {
      if (
        ws.readyState === ws.OPEN ||
        ws.readyState ===
          ws.CONNECTING
      ) {
        ws.close(
          1000,
          "Customer no response",
        );
      }
    } catch (error) {
      console.error(
        "Failed to close Exotel WebSocket:",
        error,
      );
    }

    await callManager.finalizeCurrentCall(
      "customer_no_response",
    );
  }

  function sendNoResponseReminder() {
    if (
      state.callFinalized ||
      state.callClosureRequested ||
      !state.voiceAgent
    ) {
      return;
    }

    const firstName =
      state.callContext?.firstName ||
      null;

    const reminderNumber =
      state.noResponseReminderCount;

    const prompt =
      buildNoResponseReminderPrompt({
        firstName,
        reminderNumber,
      });

    console.log(
      "Sending no-response reminder:",
      reminderNumber,
    );

    state.voiceAgent.sendText(
      prompt,
    );
  }

  function scheduleNoResponseCheck(
    sequenceId,
  ) {
    clearNoResponseTimer();

    if (
      !state.noResponseActive ||
      state.callFinalized ||
      state.callClosureRequested ||
      sequenceId !==
        state.noResponseSequenceId
    ) {
      return;
    }

    const elapsed =
      Date.now() -
      state.noResponseStartedAt;

    if (
      elapsed >=
      state.NO_RESPONSE_DISCONNECT_MS
    ) {
      disconnectForNoResponse().catch(
        (error) => {
          console.error(
            "Failed to disconnect no-response call:",
            error,
          );
        },
      );

      return;
    }

    if (
      state.noResponseReminderCount <
      state.NO_RESPONSE_REMINDER_COUNT
    ) {
      const nextReminderTime =
        state.NO_RESPONSE_REMINDER_MS *
        (
          state.noResponseReminderCount +
          1
        );

      if (
        elapsed >=
        nextReminderTime
      ) {
        state.noResponseReminderCount++;

        sendNoResponseReminder();
      }
    }

    let nextTarget =
      state.NO_RESPONSE_DISCONNECT_MS;

    if (
      state.noResponseReminderCount <
      state.NO_RESPONSE_REMINDER_COUNT
    ) {
      nextTarget =
        state.NO_RESPONSE_REMINDER_MS *
        (
          state.noResponseReminderCount +
          1
        );
    }

    const delay =
      Math.max(
        100,
        nextTarget - elapsed,
      );

    state.noResponseTimer =
      setTimeout(
        () =>
          scheduleNoResponseCheck(
            sequenceId,
          ),
        delay,
      );
  }

  function startNoResponseMonitoring() {
    if (
      state.callFinalized ||
      state.noResponseDisconnecting ||
      state.callClosureRequested
    ) {
      return;
    }

    if (state.noResponseActive) {
      return;
    }

    stopNoResponseMonitoring();

    state.noResponseActive =
      true;

    state.noResponseStartedAt =
      Date.now();

    state.noResponseReminderCount =
      0;

    state.lastNoResponseReminder =
      null;

    const sequenceId =
      state.noResponseSequenceId;

    console.log(
      "No-response monitoring started.",
    );

    scheduleNoResponseCheck(
      sequenceId,
    );
  }

  function registerCustomerActivity() {
    if (
      state.callFinalized ||
      state.noResponseDisconnecting
    ) {
      return;
    }

    if (state.callClosureRequested) {
      return;
    }

    if (state.noResponseActive) {
      console.log(
        "Customer activity detected. Resetting no-response timer.",
      );
    }

    stopNoResponseMonitoring();
  }

  function handleCallClosureRequested(
    outcome,
  ) {
    if (
      state.callFinalized ||
      state.finalizingCall
    ) {
      return;
    }

    if (
      !VALID_CLOSURE_OUTCOMES.includes(
        outcome,
      )
    ) {
      return;
    }

    state.callOutcome =
      outcome;

    state.callClosureRequested =
      true;

    stopNoResponseMonitoring();

    clearIntentionalClosureTimer();

    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "INTENTIONAL CALL CLOSURE",
    );
    console.log(
      "=================================",
    );
    console.log(
      "Outcome:",
      outcome,
    );

    scheduleIntentionalClosureFallback();
  }

  function scheduleIntentionalClosureFallback() {
    clearIntentionalClosureTimer();

    const sequenceId =
      ++state.intentionalClosureSequenceId;

    state.intentionalClosureTimer =
      setTimeout(
        () => {
          if (
            state.callFinalized ||
            !state.callClosureRequested ||
            sequenceId !==
              state.intentionalClosureSequenceId
          ) {
            return;
          }

          disconnectAfterIntentionalClosure().catch(
            (error) => {
              console.error(
                "Failed intentional closure:",
                error,
              );
            },
          );
        },
        state.INTENTIONAL_CLOSURE_FALLBACK_MS,
      );
  }

  async function disconnectAfterIntentionalClosure() {
    if (
      state.intentionalClosureDisconnecting ||
      state.callFinalized ||
      !state.callClosureRequested
    ) {
      return;
    }

    state.intentionalClosureDisconnecting =
      true;

    clearIntentionalClosureTimer();

    stopNoResponseMonitoring();

    console.log("");
    console.log(
      "=================================",
    );
    console.log(
      "INTENTIONAL CALL CLOSURE - DISCONNECTING",
    );
    console.log(
      "=================================",
    );

    state.geminiAudioEnabled =
      false;

    if (state.voiceAgent) {
      state.voiceAgent.close();
      state.voiceAgent = null;
    }

    audio.clearLocalAudio();

    try {
      if (
        ws.readyState === ws.OPEN ||
        ws.readyState ===
          ws.CONNECTING
      ) {
        ws.close(
          1000,
          "Intentional call closure",
        );
      }
    } catch (error) {
      console.error(
        "Failed to close Exotel WebSocket:",
        error,
      );
    }

    await callManager.finalizeCurrentCall(
      state.callOutcome ||
        "normal",
    );
  }

  function handleResponseComplete() {
    if (
      state.callFinalized
    ) {
      return;
    }

    if (
      state.callClosureRequested
    ) {
      clearIntentionalClosureTimer();

      state.intentionalClosureTimer =
        setTimeout(
          () => {
            disconnectAfterIntentionalClosure().catch(
              (error) => {
                console.error(
                  "Failed intentional response closure:",
                  error,
                );
              },
            );
          },
          state.INTENTIONAL_CLOSURE_DELAY_MS,
        );

      return;
    }

    startNoResponseMonitoring();
  }

  const client =
    createExotelClient(
      ws,
      state,
    );

  const audio =
    createExotelAudio(
      ws,
      state,
      client,
      {
        onCustomerSpeech:
          registerCustomerActivity,
      },
    );

  state.geminiToExotelResampler =
    new audio.StreamingPcm16Resampler(
      24000,
      state.exotelSampleRate,
    );

  const callManager =
    createExotelCallManager({
      state,
      url,
      audio,
      client,

      onCustomerActivity:
        registerCustomerActivity,

      onResponseComplete:
        handleResponseComplete,

      onCallClosureRequested:
        handleCallClosureRequested,
    });

  ws.on(
    "message",
    async (message) => {
      try {
        if (
          state.callFinalized &&
          state.finalizingCall
        ) {
          return;
        }

        const data =
          JSON.parse(
            message.toString(),
          );

        const eventType =
          data.event;

        if (
          eventType ===
          "connected"
        ) {
          console.log(
            "Exotel WebSocket connected.",
          );

          client.setStreamSid(
            data.stream_sid ||
              data.streamSid ||
              data.connected?.stream_sid ||
              data.connected?.streamSid,
          );

          return;
        }

        if (
          eventType === "start"
        ) {
          const startTime =
            Date.now();

          console.log("");
          console.log(
            "=================================",
          );
          console.log(
            "EXOTEL START EVENT",
          );
          console.log(
            "=================================",
          );

          client.setStreamSid(
            data.stream_sid ||
              data.streamSid ||
              data.start?.stream_sid ||
              data.start?.streamSid,
          );

          if (
            data.start?.media_format
          ) {
            audio.configureExotelMediaFormat(
              data.start.media_format,
            );
          }

          await callManager.hydrateCallContext(
            data,
          );

          console.log(
            "Context ready after:",
            Date.now() -
              startTime,
            "ms",
          );

          console.log(
            "Call SID:",
            state.callSid,
          );

          console.log(
            "Internal Call ID:",
            state.internalCallId,
          );

          console.log(
            "Customer context:",
            Boolean(
              state.callContext,
            ),
          );

          if (
            state.internalCallId ||
            state.callSid
          ) {
            const updates = {
              status:
                "answered",

              answeredAt:
                new Date(),
            };

            const answeredPromise =
              state.internalCallId
                ? updateCall(
                    state.internalCallId,
                    updates,
                  )
                : updateCallByExternalSid(
                    state.callSid,
                    updates,
                  );

            answeredPromise.catch(
              (error) => {
                console.error(
                  "Failed to mark call answered:",
                  error,
                );
              },
            );
          }

          const agentStart =
            Date.now();

          console.log(
            "Starting Voice Agent...",
          );

          const agent =
            await callManager.ensureVoiceAgent(
              data,
            );

          console.log(
            "Voice Agent ready after:",
            Date.now() -
              agentStart,
            "ms",
          );

          console.log(
            "Total START to Agent ready:",
            Date.now() -
              startTime,
            "ms",
          );

          if (agent) {
            audio.flushPendingAudio();
          }

          return;
        }

        if (
          eventType === "media"
        ) {
          const mediaStreamSid =
            data.stream_sid ||
            data.media?.stream_sid;

          if (mediaStreamSid) {
            client.setStreamSid(
              mediaStreamSid,
            );
          }

          if (
            data.media?.payload
          ) {
            const customerAudio =
              data.media.payload;

            if (
              state.firstCustomerAudioAt ===
              null
            ) {
              state.firstCustomerAudioAt =
                Date.now();

              console.log(
                "First customer audio after:",
                state.firstCustomerAudioAt -
                  state.callStartedAt,
                "ms",
              );
            }

            const rms =
              audio.calculateRmsFromBase64(
                customerAudio,
              );

            audio.handleCustomerSpeech(
              rms,
            );

            if (
              state.callFinalized ||
              state.callClosureRequested
            ) {
              return;
            }

            const agent =
              await callManager.ensureVoiceAgent(
                data,
              );

            if (
              agent &&
              !state.callFinalized
            ) {
              agent.sendAudio(
                customerAudio,
              );
            } else if (
              !state.callFinalized
            ) {
              state.pendingCustomerAudio.push(
                customerAudio,
              );
            }
          }

          return;
        }

        if (
          eventType === "dtmf"
        ) {
          console.log(
            "Received DTMF:",
            data.dtmf,
          );

          registerCustomerActivity();

          return;
        }

        if (
          eventType === "mark"
        ) {
          return;
        }

        if (
          eventType === "stop"
        ) {
          console.log("");
          console.log(
            "=================================",
          );
          console.log(
            "EXOTEL STOP",
          );
          console.log(
            "=================================",
          );

          stopNoResponseMonitoring();

          clearIntentionalClosureTimer();

          client.setStreamSid(
            data.stream_sid ||
              data.streamSid ||
              data.stop?.stream_sid ||
              data.stop?.streamSid,
          );

          await callManager.hydrateCallContext(
            data,
          );

          console.log(
            "Final Call SID:",
            state.callSid,
          );

          console.log(
            "Final internal Call ID:",
            state.internalCallId,
          );

          console.log(
            "Audio chunks sent:",
            state.audioChunksSent,
          );

          console.log(
            "Queued audio bytes:",
            state.totalQueuedBytes,
          );

          console.log(
            "Stop reason:",
            data.stop?.reason,
          );

          state.geminiAudioEnabled =
            false;

          audio.clearLocalAudio();

          if (state.voiceAgent) {
            state.voiceAgent.close();
            state.voiceAgent = null;
          }

          await callManager.finalizeCurrentCall(
            state.callOutcome ||
              (
                data.stop?.reason ===
                "customer_no_response"
                  ? "customer_no_response"
                  : "stop"
              ),
          );

          return;
        }
      } catch (error) {
        console.error(
          "Invalid Exotel WebSocket message:",
          error,
        );
      }
    },
  );

  ws.on(
    "close",
    async () => {
      console.log(
        "Exotel WebSocket disconnected.",
      );

      state.geminiAudioEnabled =
        false;

      audio.clearLocalAudio();

      clearNoResponseTimer();
      clearIntentionalClosureTimer();

      if (
        state.noResponseDisconnecting ||
        state.intentionalClosureDisconnecting ||
        state.callFinalized
      ) {
        return;
      }

      if (state.voiceAgent) {
        state.voiceAgent.close();
        state.voiceAgent = null;
      }

      await callManager.finalizeCurrentCall(
        state.callOutcome ||
          "close",
      );
    },
  );

  ws.on(
    "error",
    (error) => {
      console.error(
        "Exotel WebSocket error:",
        error,
      );

      state.geminiAudioEnabled =
        false;

      audio.clearLocalAudio();

      stopNoResponseMonitoring();

      clearIntentionalClosureTimer();

      if (state.voiceAgent) {
        state.voiceAgent.close();
        state.voiceAgent = null;
      }

      callManager
        .finalizeCurrentCall(
          "error",
        )
        .catch(
          (finalizeError) => {
            console.error(
              "Failed to finalize errored call:",
              finalizeError,
            );
          },
        );
    },
  );
}

module.exports = {
  handleExotelConnection,
};