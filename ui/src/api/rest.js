/**
 * U2 AUDIT:
 * - Robust REST API client utilizing the Fetch API.
 * - Implements automatic timeouts using AbortController.
 * - Prevents hanging promises and handles HTTP errors explicitly.
 */

const BASE_URL = 'http://127.0.0.1:8000/api/v1';

export async function fetchWithTimeout(endpoint, options = {}) {
  const { timeout = 8000, ...fetchOptions } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      }
    });

    clearTimeout(id);

    if (!response.ok) {
      // Safely attempt to parse error body, fallback to status text
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText };
      }
      throw new Error(`API Error [${response.status}]: ${errorData.detail || 'Unknown Error'}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out after ${timeout}ms.`);
    }
    throw error;
  }
}

/**
 * Hook for consuming the REST API in components, ensuring clean cancellation.
 * Not implemented entirely here, but this is the pure JS helper for it.
 */
