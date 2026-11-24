const { randomUUID } = require("crypto");

const { createVoiceAgent } = require("../agent/voiceAgent");

const {
  getCustomerById,
  createCustomer,
  findOrCreateCustomerByName,
  updateCustomerSummary,
  updateCustomerName,
} = require("../services/customerService");


const { createCall } = require("../services/callService");

// ============================================================
// EXTRACT CUSTOMER NAME FROM TRANSCRIPT
// ============================================================
// Simple heuristic to extract a person's name from speech.
// Returns the first capitalized word sequence that looks like a name.
function extractCustomerName(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const cleaned = text.trim();
  if (!cleaned) {
    return null;
  }

  // Common patterns for name introduction in Indian context
  const patterns = [
    /^(?:my name is|i am|i'm|this is|name is|call me)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i,
    /^([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+){0,2})\s*(?:here|speaking|calling)?$/i,
    /^([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+){0,2})$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common non-names
      const invalidNames = new Set([
        "yes", "no", "okay", "ok", "hello", "hi", "hey",
        "thanks", "thank you", "sure", "fine", "good", "bad",
        "maybe", "don't know", "not sure", "nothing", "none",
      ]);
      if (!invalidNames.has(name.toLowerCase()) && name.length >= 2) {
        return name;
      }
    }
  }

  // Fallback: if transcript is short (1-3 words) and looks like a name
  const words = cleaned.split(/\s+/);
  if (words.length >= 1 && words.length <= 3) {
    const allCapitalized = words.every(w => /^[A-Z][a-z]+$/.test(w));
    if (allCapitalized) {
      return cleaned;
    }
  }

  return null;
}

const { analyzeCall } = require("../services/callAnalysis");

async function handleBrowserConnection(ws, request) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  const customerId = url.searchParams.get("customerId");

  // --------------------------------------------------
  // CUSTOMER
  // --------------------------------------------------

  let customer = null;

  if (customerId) {
    customer = await getCustomerById(customerId);

    if (!customer) {
      // FIX: Generate new customerId instead of reusing the provided one
      // which would fail due to unique constraint on customerId field
      customer = await createCustomer({
        customerId: `CUS_${randomUUID()}`,
        source: "browser",
      });

      console.log("New browser customer created:", customer.customerId);
    } else {
      console.log("Existing browser customer found:", customer.customerId);
    }
  }

  console.log("Browser Customer ID:", customerId);
  console.log("Customer name:", customer?.name);

  console.log("Previous customer summary:", customer?.latestSummary);

  // --------------------------------------------------
  // CALL
  // --------------------------------------------------

  const callId = `CALL_${randomUUID()}`;

  console.log("Call ID:", callId);

  console.log("Client connected to /media-stream");

  // --------------------------------------------------
  // PER-CALL CONVERSATION
  // --------------------------------------------------

  // Raw conversation exists only in memory
  // during this call.

  const conversation = [];

  let voiceAgent = null;

  let callSaved = false;
  let customerNameResolved = false;

  // --------------------------------------------------
  // CREATE VOICE AGENT
  // --------------------------------------------------

  try {
    voiceAgent = await createVoiceAgent({
      customerName: customer?.name || null,

      previousSummary: customer?.latestSummary || null,
      onAudio: (audioData) => {
        console.log("Received AI audio from Gemini");

        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "audio",
              data: audioData,
            }),
          );
        }
      },

      onTranscript: async (transcript) => {
        console.log(`${transcript.type}: ${transcript.text}`);

        // Store transcript ONLY in memory

        conversation.push({
          type: transcript.type,
          text: transcript.text,
        });

        // Send transcript to browser

        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({
              type: "transcript",
              ...transcript,
            }),
          );
        }

        // ------------------------------------------------
        // CUSTOMER NAME RESOLUTION
        // ------------------------------------------------

        if (transcript.type === "user" && !customerNameResolved) {
          try {
            console.log("Trying to extract customer name...");

            const extractedName = extractCustomerName(transcript.text);

            if (!extractedName) {
              console.log("Customer name not detected yet.");

              return;
            }

            console.log("Customer name detected:", extractedName);

            customerNameResolved = true;

            // --------------------------------------------
            // FIND OR CREATE CUSTOMER
            // --------------------------------------------

            const result = await findOrCreateCustomerByName({
              name: extractedName,
              customerId,
              source: "browser",
            });

            customer = result.customer;

            console.log(
              result.isNew
                ? "New customer created by name:"
                : "Existing customer found by name:",
              customer.customerId,
            );

            console.log("Customer name:", customer.name);

            console.log("Previous summary:", customer.latestSummary);

            // --------------------------------------------
            // UPDATE CURRENT BROWSER CUSTOMER ID
            // --------------------------------------------

            console.log("Resolved customer ID:", customer.customerId);

            // --------------------------------------------
            // SEND CUSTOMER CONTEXT TO GEMINI
            // --------------------------------------------

            if (result.isNew) {
              voiceAgent.sendText(
                `The customer's name is ${customer.name}. This is a new customer. Remember that you are Prajwal. Thank the customer for sharing their name and naturally ask how you can help them with Tejo EV.`,
              );
            } else {
              voiceAgent.sendText(
                `The customer's name is ${customer.name}. This is a returning customer.

Previous customer summary:
${customer.latestSummary || "No previous summary is available."}

Naturally acknowledge that you have spoken with this customer previously. Briefly mention the relevant information from the previous conversation without inventing anything. Then ask how you can help them today.

You are Prajwal, the Tejo EV sales assistant. Do not ask the customer's name again.`,
              );
            }
          } catch (error) {
            console.error("Customer name resolution failed:", error);
          }
        }
      },

      onError: (error) => {
        console.error("Voice Agent error:", error);
      },

      onClose: () => {
        console.log("Voice Agent session closed");
      },
    });

    console.log("Voice Agent ready for browser");

    // Initial greeting

    voiceAgent.sendText(
      "Start the conversation naturally. You are Prajwal, a Tejo EV sales assistant. Greet the customer warmly, introduce yourself as Prajwal, and ask the customer for their name. Do not ask how you can help yet. First obtain the customer's name.",
    );
  } catch (error) {
    console.error("Failed to create Voice Agent for browser:", error);

    ws.close();

    return;
  }

  // --------------------------------------------------
  // BROWSER MESSAGES
  // --------------------------------------------------

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Customer audio

      if (data.type === "audio" && data.data) {
        voiceAgent.sendAudio(data.data);
      }

      // Customer text

      if (data.type === "text" && data.text) {
        voiceAgent.sendText(data.text);
      }
    } catch (error) {
      console.error("Invalid browser WebSocket message:", error);
    }
  });

  // --------------------------------------------------
  // CALL END
  // --------------------------------------------------

  ws.on("close", async () => {
    if (callSaved) {
      return;
    }

    callSaved = true;

    console.log("Browser client disconnected");

    // Close Gemini

    if (voiceAgent) {
      voiceAgent.close();
    }

    // ----------------------------------------------
    // ANALYZE CALL
    // ----------------------------------------------

    if (customerId && conversation.length > 0) {
      try {
        console.log("Analyzing completed call...");

        const analysis = await analyzeCall(conversation);

        let followUpAt = null;

        // FIX: Use callbackDate and callbackTime from analysis instead of followUpDelayMinutes
        if (
          analysis.followUpRequired &&
          analysis.callbackDate &&
          analysis.callbackTime
        ) {
          const [hours, minutes] = analysis.callbackTime.split(':').map(Number);
          const followUpDate = new Date(`${analysis.callbackDate}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00+05:30`);
          followUpAt = followUpDate;
        } else if (
          analysis.followUpRequired &&
          analysis.callbackDate
        ) {
          followUpAt = new Date(`${analysis.callbackDate}T00:00:00+05:30`);
        }

        console.log("Call analysis completed:", analysis);

        // ------------------------------------------
        // SAVE ANALYSIS TO CALL
        // ------------------------------------------

        const call = await createCall({
          callId,

          customerId: customer?.customerId || customerId,

          summary: analysis.summary,

          language: analysis.language,

          interestStatus: analysis.interestStatus,

          followUpRequired: analysis.followUpRequired,

          followUpAt: followUpAt,

          callbackReason: analysis.callbackReason,

          nextAction: analysis.nextAction,
        });

        console.log("Call saved to MongoDB:", call.callId);

        // ------------------------------------------
        // UPDATE CUSTOMER SUMMARY
        // ------------------------------------------

        await updateCustomerSummary(customer?.customerId || customerId, analysis.summary);

        console.log("Customer summary updated:", customer?.customerId || customerId);

        if (analysis.customerName) {
          await updateCustomerName(customer?.customerId || customerId, analysis.customerName);

          console.log("Customer name updated:", analysis.customerName);
        }

        // ------------------------------------------
        // RAW CONVERSATION IS NO LONGER NEEDED
        // ------------------------------------------

        console.log(
          "Raw conversation processed and released from call memory.",
        );
      } catch (error) {
        console.error("Failed to analyze/save completed call:", error);
      }
    } else {
      console.log(
        "No customer ID or conversation available. Call analysis skipped.",
      );
    }
  });

  // --------------------------------------------------
  // WEBSOCKET ERROR
  // --------------------------------------------------

  ws.on("error", (error) => {
    console.error("Browser WebSocket error:", error);
  });
}

module.exports = {
  handleBrowserConnection,
};
