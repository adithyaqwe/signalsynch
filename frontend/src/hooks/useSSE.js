import { useCallback, useEffect, useRef, useState } from "react"
import { STREAM_URL, USE_MOCK_DATA } from "../lib/api.js"
import { normalizeReconciliation } from "../lib/validation.js"

/**
 * Primary real-time channel: Server-Sent Events from GET /stream.
 *
 * Responsibilities:
 *  - Open an EventSource and listen for `reconciliation` events (and default
 *    `message` events, since some backends omit the event name).
 *  - Validate/normalize each payload; ignore malformed events without crashing.
 *  - Track connection state machine:
 *      CONNECTING | CONNECTED | ERROR | RECONNECTING | FALLBACK_POLLING
 *  - Controlled reconnect with capped exponential backoff (no rapid loops).
 *  - After repeated failures, signal fallback so the caller starts polling.
 *  - Clean up EventSource + timers on unmount.
 *
 * This hook does NOT manage polling itself; it reports connection state and
 * hands validated events to `onEvent`. The caller (App) owns dedup + history.
 */

export const SSE_STATE = {
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
  RECONNECTING: "RECONNECTING",
  FALLBACK_POLLING: "FALLBACK_POLLING",
}

const MAX_SSE_ATTEMPTS = 4 // after this many failed attempts → fallback
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 8000

export function useSSE({ enabled = true, onEvent } = {}) {
  const [state, setState] = useState(
    USE_MOCK_DATA ? SSE_STATE.CONNECTED : SSE_STATE.CONNECTING,
  )
  const esRef = useRef(null)
  const attemptsRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const onEventRef = useRef(onEvent)
  const mountedRef = useRef(true)
  const mockTimerRef = useRef(null)

  // Keep latest callback without re-subscribing the stream.
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const handleRaw = useCallback((rawData) => {
    let parsed
    try {
      parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData
    } catch {
      console.warn("[SignalSynch] Ignored SSE event: invalid JSON")
      return
    }
    const norm = normalizeReconciliation(parsed)
    if (!norm) {
      console.warn("[SignalSynch] Ignored malformed reconciliation event")
      return
    }
    onEventRef.current && onEventRef.current(norm)
  }, [])

  const connect = useCallback(() => {
    if (!enabled) return
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      // Environment without EventSource → go straight to fallback.
      setState(SSE_STATE.FALLBACK_POLLING)
      return
    }

    cleanup()
    setState(
      attemptsRef.current === 0 ? SSE_STATE.CONNECTING : SSE_STATE.RECONNECTING,
    )

    let es
    try {
      es = new EventSource(STREAM_URL())
    } catch {
      scheduleReconnect()
      return
    }
    esRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) return
      attemptsRef.current = 0
      setState(SSE_STATE.CONNECTED)
    }

    // Named contract event.
    es.addEventListener("reconciliation", (e) => handleRaw(e.data))
    // Fallback: some servers send unnamed `message` events.
    es.onmessage = (e) => handleRaw(e.data)

    es.onerror = () => {
      if (!mountedRef.current) return
      // EventSource auto-retries, but we take explicit control for backoff
      // and eventual fallback to polling.
      cleanup()
      scheduleReconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cleanup, handleRaw])

  const scheduleReconnect = useCallback(() => {
    attemptsRef.current += 1
    if (attemptsRef.current > MAX_SSE_ATTEMPTS) {
      setState(SSE_STATE.FALLBACK_POLLING)
      return
    }
    setState(SSE_STATE.ERROR)
    const backoff = Math.min(
      MAX_BACKOFF_MS,
      BASE_BACKOFF_MS * 2 ** (attemptsRef.current - 1),
    )
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect()
    }, backoff)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect])

  // Allow the caller to force a fresh SSE attempt (e.g. periodic retry while
  // in polling fallback).
  const retry = useCallback(() => {
    attemptsRef.current = 0
    connect()
  }, [connect])

  useEffect(() => {
    mountedRef.current = true

    // Mock mode: synthesize a connected stream on an interval.
    if (USE_MOCK_DATA) {
      setState(SSE_STATE.CONNECTED)
      let mod
      import("../data/mockData.js").then((m) => {
        mod = m
        mockTimerRef.current = setInterval(() => {
          if (!mountedRef.current) return
          const ev = mod.generateMockEvent({ mode: "auto" })
          handleRaw(ev)
        }, 900)
      })
      return () => {
        mountedRef.current = false
        if (mockTimerRef.current) clearInterval(mockTimerRef.current)
      }
    }

    if (enabled) connect()
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [enabled, connect, cleanup, handleRaw])

  return { state, retry, setState }
}
