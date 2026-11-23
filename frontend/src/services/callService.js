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

// Retrieves all calls for a specific customer.
export async function getCallsByCustomerId(customerId) {
  const response = await apiRequest(`/api/customers/${customerId}/details`);

  return (
    response?.calls ||
    response?.data?.calls ||
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

// Retrieves pending follow-ups from the backend.
export async function getPendingFollowUps() {
  const response = await apiRequest("/api/call/follow-ups");

  if (Array.isArray(response)) {
    return response;
  }

  return (
    response?.followUps ||
    response?.data ||
    []
  );
}