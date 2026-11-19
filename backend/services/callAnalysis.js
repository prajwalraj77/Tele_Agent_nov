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

const MODEL = "gemini-3.5-flash-lite";

const VALID_OUTCOMES = [
  "normal",
  "callback_requested",
  "demo_visit_confirmed",
  "not_interested",
  "no_response",
];

// Gets current India time.
function getCurrentIndiaTime() {
  const now = new Date();

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    },
  ).format(now);
}

// Removes invalid customer names.
function cleanAnalysisCustomerName(
  name,
) {
  if (typeof name !== "string") {
    return null;
  }

  const cleanName = name.trim();

  if (!cleanName) {
    return null;
  }

  const invalidNames = new Set([
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

// Analyzes the current call.
async function analyzeCall(
  conversation,
) {
  if (
    !conversation ||
    conversation.length === 0
  ) {
    return {
      customerName: null,
      summary: "No conversation was recorded.",
      language: null,
      interestStatus: "uncertain",
      callOutcome: "no_response",
      followUpRequired: false,
      callbackDate: null,
      callbackTime: null,
      callbackReason: null,
      nextAction: null,
    };
  }

  const conversationText = conversation
    .map((message) => {
      const speaker =
        message.type === "user"
          ? "Customer"
          : "AI Sales Assistant";

      return `${speaker}: ${message.text}`;
    })
    .join("\n");

  const currentIndiaTime =
    getCurrentIndiaTime();

  const prompt = `
You are a call analysis system for an AI voice sales platform representing Tejo EV.

Analyze ONLY the current phone conversation.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{
  "customerName": null,
  "summary": "Three short lines summarizing this call",
  "language": "Main language used by the customer",
  "interestStatus": "interested | not_interested | uncertain",
  "callOutcome": "normal | callback_requested | demo_visit_confirmed | not_interested | no_response",
  "followUpRequired": false,
  "callbackDate": null,
  "callbackTime": null,
  "callbackReason": null,
  "nextAction": "Recommended next action"
}

BUSINESS RULE:

Tejo EV sells electric scooters only.

Do not interpret a customer's interest in a car or other vehicle as
interest in a Tejo EV product.

CUSTOMER NAME:

- Use a name only when the customer explicitly provides it.
- A single name is valid.
- Never guess.
- Never use the phone number as the name.
- Ignore placeholders.

SUMMARY:

- No more than three short lines.
- Include actual requirements.
- Include daily kilometres when discussed.
- Include scooter/model interest when discussed.
- Include objections or concerns.
- Do not invent information.

INTEREST:

"not_interested":
Only when the customer clearly rejects the product/service or says they
are not interested.

"interested":
Clear product interest, purchase intent, or meaningful willingness to continue.

"uncertain":
Insufficient evidence.

Do not use old calls to decide current interestStatus.

CALL OUTCOME:

"callback_requested":
The customer clearly requests a future callback.

"demo_visit_confirmed":
The customer explicitly confirms a showroom visit, demo, or test ride.

"not_interested":
The customer explicitly rejects future sales contact.

"no_response":
Use only when the call clearly ended because the customer stopped responding.

"normal":
All other calls.

FOLLOW-UP:

Set followUpRequired to true for an explicit callback request.

CALLBACK:

Use India time.

callbackDate:
YYYY-MM-DD

callbackTime:
HH:mm

If only a date is given, callbackTime = null.

For relative requests such as "after 30 minutes" or "tomorrow evening",
calculate the date/time from the current India time only when the request is
clear enough.

Do not invent a callback time.

CURRENT INDIA TIME:

${currentIndiaTime}

CONVERSATION:

${conversationText}

Return JSON only.
`;

  try {
    const response =
      await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

    const text =
      response.text.trim();

    console.log(
      "Call analysis response:",
      text,
    );

    const analysis =
      JSON.parse(text);

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
      analysis.callbackDate !== null &&
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
      analysis.callbackTime !== null &&
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
      ![
        "interested",
        "not_interested",
        "uncertain",
      ].includes(
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
      analysis.callOutcome = "normal";
    }

    if (
      analysis.callOutcome ===
      "not_interested"
    ) {
      analysis.interestStatus =
        "not_interested";

      analysis.followUpRequired = false;
      analysis.callbackDate = null;
      analysis.callbackTime = null;
      analysis.callbackReason = null;
    }

    if (
      analysis.callOutcome ===
      "callback_requested"
    ) {
      analysis.followUpRequired = true;

      if (!analysis.callbackReason) {
        analysis.callbackReason =
          "Customer requested a callback.";
      }
    }

    if (!analysis.followUpRequired) {
      analysis.callbackDate = null;
      analysis.callbackTime = null;
      analysis.callbackReason = null;
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

// Builds the rolling customer profile.
async function buildCustomerConversationProfile({
  previousSummary = null,
  previousConversationRate = null,
  currentSummary = null,
  currentInterestStatus = "uncertain",
}) {
  if (!currentSummary) {
    return {
      summary:
        previousSummary || null,

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
- Latest uncertainty should not automatically erase strong previous history.
- Explicit not_interested must always result in 0.
- Do not use random scores.
- Do not return decimals.
`;

  try {
    const response =
      await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      });

    const text =
      response.text.trim();

    console.log(
      "Customer profile response:",
      text,
    );

    const profile =
      JSON.parse(text);

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
      conversationRate = 0;
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