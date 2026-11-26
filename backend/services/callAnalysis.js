// ============================================================
// CALL ANALYSIS
// ============================================================
// Analyzes completed calls and maintains customer history.
// ============================================================

const {
  GoogleGenAI,
} = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const PRIMARY_ANALYSIS_MODEL =
  process.env.GEMINI_ANALYSIS_MODEL ||
  "gemini-3.8-flash";

const PROFILE_MODEL =
  process.env.GEMINI_PROFILE_MODEL ||
  "gemini-3.6-flash";

const FALLBACK_MODELS = (
  process.env.GEMINI_ANALYSIS_FALLBACK_MODELS ||
  "gemini-3.6-flash,gemini-3.5-flash-lite"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const ANALYSIS_MODELS = [
  PRIMARY_ANALYSIS_MODEL,
  ...FALLBACK_MODELS,
].filter(
  (model, index, array) =>
    model && array.indexOf(model) === index,
);

const ANALYSIS_TIMEOUT_MS = 30000;
const PROFILE_TIMEOUT_MS = 30000;

const VALID_OUTCOMES = [
  "normal",
  "callback_requested",
  "demo_visit_confirmed",
  "not_interested",
  "no_response",
];

const VALID_INTEREST_STATUSES = [
  "interested",
  "not_interested",
  "uncertain",
];

const VALID_LANGUAGES = [
  "Kannada",
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Odia",
  "Assamese",
  "Konkani",
  "Urdu",
  "Kannada-English",
  "Hindi-English",
  "Tamil-English",
  "Telugu-English",
  "Malayalam-English",
  "Marathi-English",
  "Bengali-English",
  "Kannada-Hindi-English",
  "Other",
];

// ============================================================
// GENERIC GEMINI REQUEST
// ============================================================

async function generateGeminiContent({
  model,
  contents,
  operationName,
  timeoutMs = 30000,
  maxRetries = 2,
}) {
  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      console.log(
        `Gemini ${operationName} request: model=${model}, attempt=${attempt}`,
      );

      const response =
        await Promise.race([
          ai.models.generateContent({
            model,
            contents,
          }),

          new Promise((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Gemini ${operationName} API call timed out after ${timeoutMs}ms`,
                  ),
                ),
              timeoutMs,
            );
          }),
        ]);

      return response;
    } catch (error) {
      const message =
        error?.message || "";

      const code =
        error?.code ||
        error?.status ||
        error?.response?.status;

      const retryable =
        code === 429 ||
        code === 500 ||
        code === 502 ||
        code === 503 ||
        code === 504 ||
        message
          .toLowerCase()
          .includes("timed out") ||
        message
          .toLowerCase()
          .includes("high demand") ||
        message
          .toLowerCase()
          .includes("temporarily unavailable") ||
        message
          .toLowerCase()
          .includes("unavailable");

      console.error(
        `Gemini ${operationName} failed: model=${model}, attempt=${attempt}, retryable=${retryable}`,
      );

      if (error?.response?.data) {
        console.error(
          JSON.stringify(
            error.response.data,
          ),
        );
      } else {
        console.error(
          message,
        );
      }

      if (
        !retryable ||
        attempt >= maxRetries
      ) {
        throw error;
      }

      const delay =
        2000 * attempt;

      console.warn(
        `Retrying Gemini ${operationName} in ${delay}ms...`,
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delay,
          ),
      );
    }
  }

  throw new Error(
    `Gemini ${operationName} failed.`,
  );
}

// ============================================================
// ANALYSIS MODEL FALLBACK
// ============================================================

async function generateAnalysisContent(
  contents,
) {
  let lastError = null;

  for (
    let index = 0;
    index < ANALYSIS_MODELS.length;
    index++
  ) {
    const model =
      ANALYSIS_MODELS[index];

    try {
      return await generateGeminiContent({
        model,
        contents,
        operationName:
          "analysis",
        timeoutMs:
          ANALYSIS_TIMEOUT_MS,
        maxRetries: 2,
      });
    } catch (error) {
      lastError = error;

      if (
        index <
        ANALYSIS_MODELS.length - 1
      ) {
        console.warn(
          `Gemini analysis model ${model} unavailable. Trying fallback model ${ANALYSIS_MODELS[index + 1]}.`,
        );
      }
    }
  }

  throw lastError ||
    new Error(
      "All Gemini analysis models failed.",
    );
}

// ============================================================
// PROFILE MODEL
// ============================================================

async function generateProfileContent(
  contents,
) {
  return await generateGeminiContent({
    model:
      PROFILE_MODEL,
    contents,
    operationName:
      "customer profile",
    timeoutMs:
      PROFILE_TIMEOUT_MS,
    maxRetries: 2,
  });
}

// ============================================================
// JSON EXTRACTION
// ============================================================

function extractJsonFromResponse(
  text,
) {
  if (
    !text ||
    typeof text !==
      "string"
  ) {
    throw new Error(
      "Empty or invalid response from AI",
    );
  }

  const trimmed =
    text.trim();

  const jsonMatch =
    trimmed.match(
      /```(?:json)?\s*([\s\S]*?)\s*```/,
    );

  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  return trimmed;
}

// ============================================================
// CURRENT INDIA TIME
// ============================================================

function getCurrentIndiaTime() {
  const now =
    new Date();

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Asia/Kolkata",
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
      hour:
        "2-digit",
      minute:
        "2-digit",
      second:
        "2-digit",
      hour12:
        false,
    },
  ).format(now);
}

// ============================================================
// CUSTOMER NAME CLEANUP
// ============================================================

function cleanAnalysisCustomerName(
  name,
) {
  if (
    typeof name !==
    "string"
  ) {
    return null;
  }

  const cleanName =
    name.trim();

  if (!cleanName) {
    return null;
  }

  const invalidNames =
    new Set([
      "unknown",
      "unknown customer",
      "customer",
      "none",
      "null",
      "not sure",
      "not known",
      "don't know",
      "dont know",
      "no name",
    ]);

  if (
    invalidNames.has(
      cleanName.toLowerCase(),
    )
  ) {
    return null;
  }

  return cleanName;
}

// ============================================================
// ANALYZE CALL
// ============================================================

async function analyzeCall(
  conversation,
) {
  if (
    !conversation ||
    conversation.length === 0
  ) {
    return {
      customerName:
        null,

      summary:
        "No conversation was recorded.",

      language:
        null,

      interestStatus:
        "uncertain",

      callOutcome:
        "no_response",

      followUpRequired:
        false,

      callbackDate:
        null,

      callbackTime:
        null,

      callbackReason:
        null,

      nextAction:
        null,
    };
  }

  const conversationText =
    conversation
      .map(
        (message) => {
          const speaker =
            message.type ===
            "user"
              ? "Customer"
              : "AI Sales Assistant";

          return `${speaker}: ${message.text}`;
        },
      )
      .join("\n");

  const currentIndiaTime =
    getCurrentIndiaTime();

  const prompt = `
You are a STRICT call analysis system for an AI voice representative
for Tejo EV.

Analyze ONLY the CURRENT phone conversation below.

Do not use previous calls.
Do not use CRM history.
Do not infer facts that are not present in this conversation.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{
  "customerName": null,
  "summary": "Three short lines summarizing this call",
  "language": "Main language or mixed language used by the customer",
  "interestStatus": "interested | not_interested | uncertain",
  "callOutcome": "normal | callback_requested | demo_visit_confirmed | not_interested | no_response",
  "followUpRequired": false,
  "callbackDate": null,
  "callbackTime": null,
  "callbackReason": null,
  "nextAction": "Recommended next action"
}

============================================================
CUSTOMER NAME
============================================================

Use a name ONLY when the customer explicitly provides their name.

Never guess the customer's name.

Never use the phone number as the name.

Never use a model name as the customer name.

============================================================
LANGUAGE CLASSIFICATION
============================================================

Identify the language actually used by the CUSTOMER.

Do not classify the language from the AI assistant's speech.

If the customer uses Kannada mixed with English,
return:

"Kannada-English"

If the customer uses Hindi mixed with English,
return:

"Hindi-English"

If the customer clearly uses Kannada, Hindi and English,
return:

"Kannada-Hindi-English"

If the customer uses mostly one language,
return that language.

Do not automatically classify a mixed Bangalore conversation
as Hindi merely because some words resemble Hindi.

The customer's actual spoken language is more important than
isolated words.

============================================================
SUMMARY
============================================================

Provide exactly three short lines.

Capture:

- What the customer wanted
- Models/products/competitors discussed
- Important questions, objections or next action

Do not invent information.

If the customer repeatedly asks about range, battery, price,
features, models, competitors, comparisons or specifications,
include that in the summary.

============================================================
INTEREST CLASSIFICATION
============================================================

Use ONLY the CURRENT conversation.

IMPORTANT:

A customer does NOT need to say:

"I want to buy."

to be considered interested.

Classify as "interested" when the customer demonstrates
meaningful product or purchase exploration.

Examples of INTERESTED behavior:

- Asking about a Tejo EV model
- Asking about price
- Asking about range
- Asking about battery
- Asking about specifications
- Asking about features
- Asking which model is suitable
- Comparing Tejo EV with Ather
- Comparing Tejo EV with Simple One
- Comparing Tejo EV with iQube
- Asking differences between EV models
- Asking about a competitor and then comparing with Tejo EV
- Asking about a test ride/demo
- Asking about showroom availability
- Asking about purchase process
- Asking about variants
- Asking about charging
- Asking multiple product questions
- Continuing the conversation to understand the product

These behaviors indicate PRODUCT EXPLORATION.

Product exploration should normally be classified as:

"interested"

even when purchase timing is unknown.

Use "uncertain" when the evidence is genuinely insufficient.

Examples:

- Customer gives a vague response without discussing a product.
- Customer only says hello/goodbye.
- Customer gives insufficient information.
- Conversation contains no meaningful customer intent.

Use "not_interested" ONLY when the customer clearly rejects
the product/service or future sales contact.

Examples:

- "I am not interested."
- "Don't call me."
- "I don't want an EV."
- "No requirement."
- "Remove my number."
- "Please don't contact me again."

Never classify a customer as not_interested merely because
they did not commit to purchase.

============================================================
CALL OUTCOME
============================================================

"callback_requested":

Use ONLY when the customer clearly asks for a future callback.

Examples:

- "Call me later."
- "Two minutes later call me."
- "Tomorrow call me."
- "I will talk later, call me back."
- "Please call me after work."

"demo_visit_confirmed":

Use when the customer explicitly confirms a demo,
test ride or showroom visit.

"not_interested":

Use when the customer explicitly rejects future sales contact.

"no_response":

Use only when the call clearly ended because the customer
stopped responding.

"normal":

Use for all other completed conversations.

IMPORTANT:

Asking product questions is NOT a "normal/no-interest" signal.

A customer can have:

interestStatus = "interested"

and:

callOutcome = "normal"

when they are exploring but did not request a callback,
demo or purchase action.

============================================================
FOLLOW-UP
============================================================

Set:

followUpRequired = true

ONLY when a concrete future action is required,
especially an explicit callback request.

Normal product exploration does not automatically mean
followUpRequired = true.

If the customer explicitly asks for a callback,
followUpRequired MUST be true.

============================================================
CALLBACK DATE/TIME
============================================================

Use India time.

Current India time:

${currentIndiaTime}

callbackDate format:

YYYY-MM-DD

callbackTime format:

HH:mm

If the customer gives a clear relative time,
calculate it from the current India time.

Examples:

"after two minutes"

"after 30 minutes"

"tomorrow morning"

"today evening"

Only calculate when the request is sufficiently clear.

Do NOT invent a callback time.

If no callback is requested:

callbackDate = null
callbackTime = null
callbackReason = null

============================================================
IMPORTANT ENTITY RULE
============================================================

The transcript may contain incorrect speech-to-text results.

Do NOT repair an uncertain word by assuming it is a Tejo EV model.

For example:

"iQOO T Pro"

must NOT automatically become a Tejo EV model.

"Simple One"

must remain a possible competitor unless the conversation
clearly establishes otherwise.

"Ather"

is a competitor reference unless the conversation proves otherwise.

If an entity is uncertain, describe it as an uncertain/possibly
recognized competitor or model rather than inventing a Tejo model.

============================================================
BUSINESS RULE
============================================================

Tejo EV sells electric two-wheelers only.

Do not interpret interest in cars or unrelated products
as Tejo EV purchase interest.

============================================================
CURRENT CONVERSATION
============================================================

${conversationText}

============================================================
FINAL INSTRUCTION
============================================================

Return ONLY valid JSON.

Do not add markdown.

Do not add explanations.
`;

  try {
    const response =
      await generateAnalysisContent(
        prompt,
      );

    const text =
      response.text.trim();

    console.log(
      "Call analysis response:",
      text,
    );

    const analysis =
      JSON.parse(
        extractJsonFromResponse(
          text,
        ),
      );

    if (
      typeof analysis.summary !==
      "string"
    ) {
      throw new Error(
        "Invalid analysis: summary is missing.",
      );
    }

    if (
      typeof analysis.followUpRequired !==
      "boolean"
    ) {
      throw new Error(
        "Invalid analysis: followUpRequired must be boolean.",
      );
    }

    if (
      analysis.callbackDate !==
        null &&
      (
        typeof analysis.callbackDate !==
          "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(
          analysis.callbackDate,
        )
      )
    ) {
      throw new Error(
        "Invalid analysis: callbackDate format.",
      );
    }

    if (
      analysis.callbackTime !==
        null &&
      (
        typeof analysis.callbackTime !==
          "string" ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
          analysis.callbackTime,
        )
      )
    ) {
      throw new Error(
        "Invalid analysis: callbackTime format.",
      );
    }

    analysis.customerName =
      cleanAnalysisCustomerName(
        analysis.customerName,
      );

    if (
      !VALID_INTEREST_STATUSES.includes(
        analysis.interestStatus,
      )
    ) {
      analysis.interestStatus =
        "uncertain";
    }

    if (
      !VALID_OUTCOMES.includes(
        analysis.callOutcome,
      )
    ) {
      analysis.callOutcome =
        "normal";
    }

    if (
      !VALID_LANGUAGES.includes(
        analysis.language,
      )
    ) {
      analysis.language =
        analysis.language
          ? String(
              analysis.language,
            ).trim()
          : null;
    }

    // Explicit outcome normalization.
    if (
      analysis.callOutcome ===
      "not_interested"
    ) {
      analysis.interestStatus =
        "not_interested";

      analysis.followUpRequired =
        false;

      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    if (
      analysis.callOutcome ===
      "callback_requested"
    ) {
      analysis.followUpRequired =
        true;

      if (
        !analysis.callbackReason
      ) {
        analysis.callbackReason =
          "Customer requested a callback.";
      }
    }

    if (
      analysis.callOutcome ===
      "demo_visit_confirmed"
    ) {
      analysis.followUpRequired =
        false;

      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    if (
      analysis.callOutcome ===
      "no_response"
    ) {
      analysis.followUpRequired =
        false;

      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    if (
      !analysis.followUpRequired
    ) {
      analysis.callbackDate =
        null;

      analysis.callbackTime =
        null;

      analysis.callbackReason =
        null;
    }

    return analysis;
  } catch (error) {
    console.error(
      "Call analysis failed:",
      error,
    );

    throw error;
  }
}

// ============================================================
// CUSTOMER PROFILE
// ============================================================

async function buildCustomerConversationProfile({
  previousSummary = null,
  previousConversationRate = null,
  currentSummary = null,
  currentInterestStatus =
    "uncertain",
}) {
  if (!currentSummary) {
    return {
      summary:
        previousSummary ||
        null,

      conversationRate:
        typeof previousConversationRate ===
        "number"
          ? previousConversationRate
          : null,
    };
  }

  const previousRate =
    typeof previousConversationRate ===
    "number"
      ? previousConversationRate
      : 50;

  const previousHistory =
    previousSummary ||
    "No previous customer history is available.";

  const prompt = `
You maintain the overall customer profile for a Tejo EV sales CRM.

Create an updated customer history summary AND overall conversation rate.

The score represents the customer's overall interest and engagement with Tejo EV.

PREVIOUS OVERALL SUMMARY:

${previousHistory}

PREVIOUS OVERALL SCORE:

${previousRate}

LATEST CALL SUMMARY:

${currentSummary}

LATEST CALL INTEREST STATUS:

${currentInterestStatus}

Return ONLY valid JSON:

{
  "summary": "3 or 4 short lines",
  "conversationRate": 0
}

SUMMARY RULES:

- Exactly 3 or 4 short lines.
- Combine previous history and latest call.
- Keep important stable information.
- Keep vehicle/model interest.
- Keep daily kilometres.
- Keep routine.
- Keep use case.
- Keep charging information.
- Keep budget.
- Keep purchase timeline.
- Keep objections and preferences.
- Consolidate repeated information.
- Do not simply append the latest call.
- Do not invent information.

CONVERSATION RATE:

The rate must be an integer from 0 to 100.

Use the complete customer history.

90-100:
Very strong and consistent interest.

75-89:
Clear interest and meaningful buying intent.

60-74:
Positive interest but still exploring.

40-59:
Mixed or uncertain engagement.

20-39:
Weak interest, hesitation, or significant objections.

1-19:
Very low interest.

0:
Explicit rejection or request to stop future sales contact.

IMPORTANT:

- Latest call influences the score.
- Product exploration such as model comparison, pricing,
  range, battery and specifications is evidence of interest.
- Latest uncertainty should not automatically erase strong previous history.
- Explicit not_interested must always result in 0.
- Do not use random scores.
- Do not return decimals.
`;

  try {
    const response =
      await generateProfileContent(
        prompt,
      );

    const text =
      response.text.trim();

    console.log(
      "Customer profile response:",
      text,
    );

    const profile =
      JSON.parse(
        extractJsonFromResponse(
          text,
        ),
      );

    let conversationRate =
      Number(
        profile.conversationRate,
      );

    if (
      !Number.isFinite(
        conversationRate,
      )
    ) {
      conversationRate =
        previousRate;
    }

    conversationRate =
      Math.round(
        Math.max(
          0,
          Math.min(
            100,
            conversationRate,
          ),
        ),
      );

    if (
      currentInterestStatus ===
      "not_interested"
    ) {
      conversationRate =
        0;
    }

    const summary =
      typeof profile.summary ===
        "string" &&
      profile.summary.trim()
        ? profile.summary.trim()
        : currentSummary;

    return {
      summary,
      conversationRate,
    };
  } catch (error) {
    console.error(
      "Customer profile generation failed:",
      error,
    );

    return {
      summary:
        currentSummary ||
        previousSummary ||
        null,

      conversationRate:
        currentInterestStatus ===
        "not_interested"
          ? 0
          : previousConversationRate,
    };
  }
}

module.exports = {
  analyzeCall,
  buildCustomerConversationProfile,
};