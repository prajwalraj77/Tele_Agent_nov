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