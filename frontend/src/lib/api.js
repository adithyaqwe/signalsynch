/**
 * Centralized API configuration layer.
 *
 * All backend access flows through here so no component hardcodes a URL.
 * The base URL is read from Vite env (VITE_API_BASE_URL); it falls back to
 * the contract default of http://localhost:8000 for local development.
 *
 * Endpoints (contract — do NOT invent or modify):
 *   GET /stream                 (SSE)
 *   GET /events/latest?limit=20 (polling fallback)
 *   GET /audit?page=1&limit=50
 *   GET /health
 *
 * The frontend NEVER calls POST /ingest.
 */

const RAW_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:8000"

// Normalize: strip a single trailing slash so path joins are predictable.
export const API_BASE_URL = String(RAW_BASE).replace(/\/+$/, "")

export const USE_MOCK_DATA =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  String(import.meta.env.VITE_USE_MOCK_DATA).toLowerCase() === "true"

/** Build a fully-qualified URL for a contract path. */
export function apiUrl(path, params) {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
  )
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

export const STREAM_URL = () => apiUrl("/stream")

/** Small fetch helper with timeout + JSON parsing and consistent errors. */
async function getJSON(path, { params, signal, timeoutMs = 8000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  // Chain an external abort signal into our controller.
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener("abort", () => controller.abort(), { once: true })
  }
  try {
    const res = await fetch(apiUrl(path, params), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${path}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** GET /health */
export function fetchHealth(opts) {
  return getJSON("/health", { timeoutMs: 5000, ...opts })
}

/** GET /events/latest?limit=N */
export function fetchLatestEvents(limit = 20, opts) {
  return getJSON("/events/latest", { params: { limit }, ...opts })
}

/** GET /audit?page=P&limit=N */
export function fetchAudit(page = 1, limit = 50, opts) {
  return getJSON("/audit", { params: { page, limit }, ...opts })
}
