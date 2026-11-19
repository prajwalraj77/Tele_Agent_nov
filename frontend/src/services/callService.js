// ============================================================
// CALL SERVICE
// ============================================================
// Handles call-related API requests.
// ============================================================

import { apiRequest } from "./api";

// Retrieves recent calls from the backend.
export async function getCalls() {
  const response =
    await apiRequest("/api/call");

  if (Array.isArray(response)) {
    return response;
  }

  return (
    response?.calls ||
    response?.data ||
    []
  );
}

// Starts a new outbound call.
export async function startCall(
  phoneNumber,
) {
  return apiRequest(
    "/api/call",
    {
      method: "POST",

      body: JSON.stringify({
        phoneNumber,
      }),
    },
  );
}