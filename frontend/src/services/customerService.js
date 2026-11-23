// ============================================================
// CUSTOMER SERVICE
// ============================================================
// Handles customer-related API requests.
// ============================================================

import { apiRequest } from "./api";

// Retrieves customers from the backend.
export async function getCustomers() {
  const response =
    await apiRequest("/api/customers");

  if (Array.isArray(response)) {
    return response;
  }

  return (
    response?.customers ||
    response?.data ||
    []
  );
}

// Retrieves detailed customer info with call history.
export async function getCustomerDetails(customerId) {
  const response = await apiRequest(`/api/customers/${customerId}/details`);

  return (
    response?.data ||
    response ||
    {}
  );
}