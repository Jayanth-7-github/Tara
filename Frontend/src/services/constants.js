// Centralized constants used across the frontend
export const ADMIN_TOKEN = "tara1543";

// Backend base URL (defaults to local dev backend)
// You can override by creating `Frontend/.env` with: VITE_API_BASE=http://localhost:2000/api
export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:2000/api";
