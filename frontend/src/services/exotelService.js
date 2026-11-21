// ============================================================
// EXOTEL SERVICE
// ============================================================
// Handles Exotel-related API requests.
// ============================================================

import { apiRequest } from "./api";

// Retrieves the public Exotel WebSocket stream URL.
export async function getStreamUrl() {
  const response = await apiRequest("/api/exotel/stream-url");

  return response?.url || null;
}