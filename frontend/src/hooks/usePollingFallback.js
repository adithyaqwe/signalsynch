import { useCallback, useEffect, useRef } from "react"
import { fetchLatestEvents, USE_MOCK_DATA } from "../lib/api.js"
import { normalizeReconciliation } from "../lib/validation.js"

/**
 * Polling fallback: GET /events/latest?limit=N every `intervalMs`.
 *
 * Only runs when `active` is true — the caller flips this on when SSE enters
 * FALLBACK_POLLING and off when SSE reconnects, so SSE and polling never run
 * continuously at the same time.
 *
 * Each event is validated + normalized and passed to `onEvents` (newest order
 * preserved from the API). Dedup is handled by the caller via reconciliation_id.
 */
export function usePollingFallback({
  active = false,
  intervalMs = 2000,
  limit = 20,
  onEvents,
} = {}) {
  const timerRef = useRef(null)
  const inFlightRef = useRef(false)
  const onEventsRef = useRef(onEvents)
  const mountedRef = useRef(true)

  useEffect(() => {
    onEventsRef.current = onEvents
  }, [onEvents])

  const poll = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      let events
      if (USE_MOCK_DATA) {
        const mod = await import("../data/mockData.js")
        events = mod.generateMockBatch(3)
      } else {
        const data = await fetchLatestEvents(limit)
        events = Array.isArray(data?.events) ? data.events : []
      }
      const normalized = []
      for (const ev of events) {
        const n = normalizeReconciliation(ev)
        if (n) normalized.push(n)
      }
      if (mountedRef.current && normalized.length && onEventsRef.current) {
        onEventsRef.current(normalized)
      }
    } catch {
      // Swallow — caller reflects overall offline state via health.
      console.warn("[SignalSynch] Polling request failed")
    } finally {
      inFlightRef.current = false
    }
  }, [limit])

  useEffect(() => {
    mountedRef.current = true
    if (!active) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return () => {}
    }
    // Immediate poll, then on interval.
    poll()
    timerRef.current = setInterval(poll, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [active, intervalMs, poll])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])
}
