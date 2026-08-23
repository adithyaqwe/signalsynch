/**
 * SignalSynch API layer
 *
 * REST backend:
 *   http://localhost:5000/api
 *
 * Realtime backend:
 *   Socket.IO on http://localhost:5000
 *
 * Components should use these helpers rather than hardcoding URLs.
 */

const RAW_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:5000/api"

export const API_BASE_URL = String(RAW_BASE).replace(/\/+$/, "")

export const SOCKET_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SOCKET_URL) ||
  API_BASE_URL.replace(/\/api$/, "")

export const USE_MOCK_DATA =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  String(import.meta.env.VITE_USE_MOCK_DATA).toLowerCase() === "true"

export function apiUrl(path, params) {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
  )

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

async function getJSON(path, { params, signal, timeoutMs = 8000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true },
      )
    }
  }

  try {
    const response = await fetch(apiUrl(path, params), {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${path}`)
    }

    const body = await response.json()

    if (body && body.success === false) {
      throw new Error(body.message || `API request failed for ${path}`)
    }

    return body
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Backend health endpoint.
 */
export function fetchHealth(opts) {
  return getJSON("/health", {
    timeoutMs: 5000,
    ...opts,
  })
}

/**
 * Backend reconciliation history.
 *
 * GET /api/reconciliation?page=1&limit=20
 */
export function fetchReconciliations(page = 1, limit = 20, opts) {
  return getJSON("/reconciliation", {
    params: { page, limit },
    ...opts,
  })
}

/**
 * Single reconciliation record.
 */
export function fetchReconciliation(eventId, opts) {
  return getJSON(
    `/reconciliation/${encodeURIComponent(eventId)}`,
    opts,
  )
}

/**
 * Backend audit logs.
 *
 * GET /api/audit-logs?page=1&limit=20
 */
export function fetchAudit(page = 1, limit = 20, opts) {
  return getJSON("/audit-logs", {
    params: { page, limit },
    ...opts,
  })
}