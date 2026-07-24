// Centralized constants used across the frontend
export const ADMIN_TOKEN = "tara1543";

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://tara-kbxn.onrender.com/api"
    : "http://localhost:2000/api");

export const PISTON_API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://tara-kbxn.onrender.com/api/v2/execute"
    : "http://localhost:2000/api/v2/execute");