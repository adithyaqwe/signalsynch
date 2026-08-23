import { useCallback, useEffect, useRef } from "react"
import {
  fetchReconciliations,
  USE_MOCK_DATA,
} from "../lib/api.js"
import { normalizeReconciliation } from "../lib/validation.js"

/**
 * REST polling fallback.
 *
 * The current backend exposes:
 *   GET /api/reconciliation?page=1&limit=N
 *
 * Socket.IO is the primary realtime channel. This hook is only activated
 * by App when the realtime connection is unavailable.
 */
export function usePollingFallback({
  active = false,
  intervalMs = 5000,
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
        const response = await fetchReconciliations(1, limit)

        events = Array.isArray(response?.data)
          ? response.data
          : []
      }

      const normalized = []

      for (const event of events) {
        const record = normalizeReconciliation(event)

        if (record) {
          normalized.push(record)
        }
      }

      if (
        mountedRef.current &&
        normalized.length > 0 &&
        onEventsRef.current
      ) {
        onEventsRef.current(normalized)
      }
    } catch (error) {
      console.warn(
        "[SignalSynch] Reconciliation polling failed:",
        error?.message || error,
      )
    } finally {
      inFlightRef.current = false
    }
  }, [limit])

  useEffect(() => {
    mountedRef.current = true

    if (!active) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      timerRef.current = null
      return undefined
    }

    // Fetch immediately when fallback mode begins.
    poll()

    timerRef.current = setInterval(poll, intervalMs)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      timerRef.current = null
    }
  }, [active, intervalMs, poll])

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])
}