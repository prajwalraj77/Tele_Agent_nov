// ============================================================
// GEMINI LIVE SESSION
// ============================================================
// Handles Gemini Live audio, transcripts, interruptions, and tools.
// ============================================================

const {
  GoogleGenAI,
  Modality,
} = require("@google/genai");

const {
  buildSystemInstruction,
} = require("./geminiPrompts");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL =
  "gemini-2.0-flash-live-001";

const END_CALL_TOOL = {
  name: "endCall",

  description:
    "Marks an intentional inbound call closure after a confirmed callback request, confirmed demo/showroom/test ride, or explicit customer decision to end the conversation.",

  parametersJsonSchema: {
    type: "object",

    properties: {
      reason: {
        type: "string",

        enum: [
          "callback_requested",
          "demo_visit_confirmed",
          "not_interested",
        ],

        description:
          "The reason the inbound call should be intentionally closed.",
      },
    },

    required: [
      "reason",
    ],

    additionalProperties: false,
  },
};

async function createGeminiLiveSession({
  customerExists = false,
  customerName = null,
  firstName = null,
  previousSummary = null,

  onAudio,
  onTranscript,
  onInterrupted,
  onResponseStart,
  onResponseComplete,
  onEndCall,
  onError,
  onClose,
}) {
  let closed = false;
  let opened = false;
  let responseActive = false;
  let session = null;
  let endCallSignaled = false;

  let resolveReady;
  let rejectReady;

  const readyPromise =
    new Promise(
      (resolve, reject) => {
        resolveReady =
          resolve;

        rejectReady =
          reject;
      },
    );

  let readySettled =
    false;

  function resolveReadyOnce() {
    if (readySettled) {
      return;
    }

    readySettled =
      true;

    resolveReady();
  }

  function rejectReadyOnce(
    error,
  ) {
    if (readySettled) {
      return;
    }

    readySettled =
      true;

    rejectReady(error);
  }

  const systemInstruction =
    buildSystemInstruction({
      customerExists,
      firstName:
        firstName ||
        customerName ||
        null,
      previousSummary,
    });

  console.log("");
  console.log(
    "=================================",
  );
  console.log(
    "CREATING GEMINI LIVE SESSION",
  );
  console.log(
    "=================================",
  );

  console.log(
    "Customer exists:",
    customerExists,
  );

  console.log(
    "Customer name:",
    customerName ||
      null,
  );

  console.log(
    "First name:",
    firstName ||
      null,
  );

  console.log(
    "Previous summary:",
    Boolean(
      previousSummary,
    ),
  );

  try {
    session =
      await ai.live.connect({
        model:
          MODEL,

        config: {
          responseModalities: [
            Modality.AUDIO,
          ],

          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName:
                  "Sadachbia",
              },
            },
          },

          systemInstruction: {
            parts: [
              {
                text:
                  systemInstruction,
              },

              {
                text: `
LANGUAGE EXECUTION RULE:

The customer's latest spoken language determines the next response language.

Start the call in natural Bangalore Kannada mixed with everyday English.

After the customer speaks, automatically follow the customer's Indian language.

Use natural regional-language + English code-switching.

Never announce a language change.

Never ask permission to change language.

Never use non-Indian foreign languages.

Do not produce formal textbook speech.

Speak naturally like a normal person on a phone call.
`,
              },
            ],
          },

          inputAudioTranscription: {},

          outputAudioTranscription: {},

          tools: [
            {
              functionDeclarations: [
                END_CALL_TOOL,
              ],
            },
          ],
        },

        callbacks: {
          onopen: () => {
            if (closed) {
              return;
            }

            opened =
              true;

            console.log(
              "=================================",
            );

            console.log(
              "GEMINI LIVE SESSION CONNECTED",
            );

            console.log(
              "=================================",
            );

            resolveReadyOnce();
          },

          onmessage:
            async (
              message,
            ) => {
              if (closed) {
                return;
              }

              const functionCalls =
                message?.toolCall
                  ?.functionCalls ||
                [];

              if (
                functionCalls.length >
                  0 &&
                session
              ) {
                const functionResponses =
                  [];

                for (
                  const functionCall of
                    functionCalls
                ) {
                  if (
                    functionCall.name !==
                    "endCall"
                  ) {
                    functionResponses.push({
                      id:
                        functionCall.id,

                      name:
                        functionCall.name,

                      response: {
                        result:
                          "Unknown function.",
                      },
                    });

                    continue;
                  }

                  const reason =
                    typeof
                      functionCall
                        .args
                        ?.reason ===
                    "string"
                      ? functionCall
                          .args
                          .reason
                      : "callback_requested";

                  if (
                    !endCallSignaled
                  ) {
                    endCallSignaled =
                      true;

                    console.log("");
                    console.log(
                      "=================================",
                    );

                    console.log(
                      "GEMINI END CALL REQUEST",
                    );

                    console.log(
                      "=================================",
                    );

                    console.log(
                      "Reason:",
                      reason,
                    );

                    try {
                      await onEndCall?.({
                        reason,

                        args:
                          functionCall.args ||
                          {},
                      });
                    } catch (
                      error
                    ) {
                      console.error(
                        "Failed to process Gemini endCall:",
                        error,
                      );
                    }
                  }

                  functionResponses.push({
                    id:
                      functionCall.id,

                    name:
                      functionCall.name,

                    response: {
                      result:
                        "Call closure has been registered. Give one brief polite natural closing sentence and then stop.",
                    },
                  });
                }

                try {
                  session.sendToolResponse({
                    functionResponses,
                  });
                } catch (
                  error
                ) {
                  console.error(
                    "Failed to send Gemini tool response:",
                    error,
                  );

                  onError?.(
                    error,
                  );
                }
              }

              const serverContent =
                message?.serverContent;

              if (
                !serverContent
              ) {
                return;
              }

              if (
                serverContent.interrupted ===
                true
              ) {
                responseActive =
                  false;

                console.log(
                  "GEMINI RESPONSE INTERRUPTED",
                );

                onInterrupted?.();

                return;
              }

              const modelParts =
                serverContent
                  .modelTurn
                  ?.parts ||
                [];

              if (
                modelParts.length >
                  0 &&
                !responseActive
              ) {
                responseActive =
                  true;

                onResponseStart?.();
              }

              for (
                const part of
                  modelParts
              ) {
                if (closed) {
                  return;
                }

                if (
                  part.inlineData
                    ?.data
                ) {
                  onAudio?.(
                    part
                      .inlineData
                      .data,
                  );
                }
              }

              if (
                serverContent
                  .inputTranscription
                  ?.text
              ) {
                onTranscript?.({
                  type:
                    "user",

                  text:
                    serverContent
                      .inputTranscription
                      .text,
                });
              }

              if (
                serverContent
                  .outputTranscription
                  ?.text
              ) {
                onTranscript?.({
                  type:
                    "assistant",

                  text:
                    serverContent
                      .outputTranscription
                      .text,
                });
              }

              if (
                serverContent
                  .turnComplete ===
                true
              ) {
                if (
                  responseActive
                ) {
                  responseActive =
                    false;

                  onResponseComplete?.();
                }
              }
            },

          onerror:
            (
              error,
            ) => {
              console.error(
                "Gemini Live error:",
                error,
              );

              rejectReadyOnce(
                error,
              );

              onError?.(
                error,
              );
            },

          onclose:
            (
              event,
            ) => {
              opened =
                false;

              responseActive =
                false;

              if (
                !readySettled
              ) {
                rejectReadyOnce(
                  new Error(
                    "Gemini Live session closed before becoming ready.",
                  ),
                );
              }

              onClose?.(
                event,
              );
            },
        },
      });

    await Promise.race([
      readyPromise,

      new Promise(
        (
          _,
          reject,
        ) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  "Gemini Live connection timed out.",
                ),
              ),
            15000,
          );
        },
      ),
    ]);

    if (closed) {
      try {
        session.close();
      } catch {}

      throw new Error(
        "Gemini session closed during initialization.",
      );
    }

    console.log(
      "Gemini Live session ready.",
    );

    return {
      sendAudio(
        base64Audio,
      ) {
        if (
          closed ||
          !opened ||
          !session ||
          !base64Audio
        ) {
          return;
        }

        try {
          session.sendRealtimeInput({
            audio: {
              data:
                base64Audio,

              mimeType:
                "audio/pcm;rate=16000",
            },
          });
        } catch (
          error
        ) {
          console.error(
            "Failed to send audio to Gemini:",
            error,
          );

          onError?.(
            error,
          );
        }
      },

      sendText(
        text,
      ) {
        if (
          closed ||
          !opened ||
          !session ||
          !text
        ) {
          return;
        }

        try {
          session.sendRealtimeInput({
            text,
          });
        } catch (
          error
        ) {
          console.error(
            "Failed to send text to Gemini:",
            error,
          );

          onError?.(
            error,
          );
        }
      },

      isOpen() {
        return (
          opened &&
          !closed
        );
      },

      isClosed() {
        return closed;
      },

      close() {
        if (closed) {
          return;
        }

        closed =
          true;

        opened =
          false;

        responseActive =
          false;

        try {
          session?.close();
        } catch (
          error
        ) {
          console.error(
            "Error closing Gemini session:",
            error,
          );
        }
      },
    };
  } catch (
    error
  ) {
    closed =
      true;

    opened =
      false;

    try {
      session?.close();
    } catch {}

    console.error(
      "Failed to create Gemini Live session:",
      error,
    );

    throw error;
  }
}

module.exports = {
  createGeminiLiveSession,
};