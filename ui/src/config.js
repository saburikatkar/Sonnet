/**
 * Config-based API Base URL for Team Synora Desktop UI
 * Allows targeting local FastAPI, mock services, or remote endpoints via VITE_API_BASE_URL
 * Safe for both Vite client runtime and Node.js testing environments.
 */
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000'