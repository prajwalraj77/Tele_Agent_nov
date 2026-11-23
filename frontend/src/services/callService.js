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

// ============================================================
// BULK CALL SERVICE
// ============================================================

// Starts a new bulk dial campaign.
export async function startBulkCall(name, phoneNumbers, config = {}) {
  return apiRequest(
    "/api/call/bulk",
    {
      method: "POST",
      body: JSON.stringify({ name, phoneNumbers, config }),
    },
  );
}

// Gets bulk call status.
export async function getBulkCallStatus(bulkId) {
  return apiRequest(`/api/call/bulk/${bulkId}`);
}

// Lists all bulk calls.
export async function listBulkCalls(limit = 50) {
  const response = await apiRequest(`/api/call/bulk?limit=${limit}`);

  if (Array.isArray(response)) {
    return response;
  }

  return response?.bulkCalls || response?.data || [];
}

// Pauses a bulk call campaign.
export async function pauseBulkCall(bulkId) {
  return apiRequest(`/api/call/bulk/${bulkId}/pause`, { method: "POST" });
}

// Resumes a bulk call campaign.
export async function resumeBulkCall(bulkId) {
  return apiRequest(`/api/call/bulk/${bulkId}/resume`, { method: "POST" });
}

// Cancels a bulk call campaign.
export async function cancelBulkCall(bulkId) {
  return apiRequest(`/api/call/bulk/${bulkId}/cancel`, { method: "POST" });
}

// Gets all calls for a specific bulk campaign.
export async function getBulkCallCalls(bulkId) {
  const response = await apiRequest(`/api/call/bulk/${bulkId}/calls`);

  if (Array.isArray(response)) {
    return response;
  }

  return response?.calls || response?.data || [];
}