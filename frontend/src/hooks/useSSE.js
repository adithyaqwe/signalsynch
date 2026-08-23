import { useCallback, useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import { SOCKET_URL, USE_MOCK_DATA } from "../lib/api.js"
import { normalizeReconciliation } from "../lib/validation.js"

export const SSE_STATE = {
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
  RECONNECTING: "RECONNECTING",
  FALLBACK_POLLING: "FALLBACK_POLLING",
}

/**
 * Realtime connection hook.
 *
 * The hook keeps the existing useSSE interface used by App.jsx,
 * but the real transport is now Socket.IO because that is what
 * the current backend exposes.
 *
 * Backend realtime event:
 *   reconciliation-result
 *
 * The backend emits the complete reconciliation record after
 * ML analysis and reconciliation.
 */
export function useSSE({ enabled = true, onEvent } = {}) {
  const [state, setState] = useState(
    USE_MOCK_DATA ? SSE_STATE.CONNECTED : SSE_STATE.CONNECTING,
  )

  const socketRef = useRef(null)
  const onEventRef = useRef(onEvent)
  const mountedRef = useRef(true)
  const mockTimerRef = useRef(null)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const handleReconciliation = useCallback((raw) => {
    const normalized = normalizeReconciliation(raw)

    if (!normalized) {
      console.warn(
        "[SignalSynch] Ignored malformed reconciliation-result event",
      )
      return
    }

    onEventRef.current?.(normalized)
  }, [])

  const connect = useCallback(() => {
    if (!enabled || USE_MOCK_DATA) return

    cleanup()

    setState((prev) =>
      prev === SSE_STATE.CONNECTED
        ? SSE_STATE.RECONNECTING
        : SSE_STATE.CONNECTING,
    )

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 8000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      if (!mountedRef.current) return

      setState(SSE_STATE.CONNECTED)

      console.info(
        `[SignalSynch] Socket.IO connected: ${socket.id}`,
      )
    })

    socket.on("reconciliation-result", handleReconciliation)

    socket.on("connect_error", (error) => {
      if (!mountedRef.current) return

      console.warn(
        "[SignalSynch] Socket.IO connection failed:",
        error?.message || error,
      )

      setState(SSE_STATE.FALLBACK_POLLING)
    })

    socket.on("disconnect", (reason) => {
      if (!mountedRef.current) return

      console.warn(
        `[SignalSynch] Socket.IO disconnected: ${reason}`,
      )

      setState(SSE_STATE.FALLBACK_POLLING)
    })
  }, [enabled, cleanup, handleReconciliation])

  const retry = useCallback(() => {
    connect()
  }, [connect])

  useEffect(() => {
    mountedRef.current = true

    if (USE_MOCK_DATA) {
      setState(SSE_STATE.CONNECTED)

      import("../data/mockData.js").then((mod) => {
        if (!mountedRef.current) return

        mockTimerRef.current = setInterval(() => {
          if (!mountedRef.current) return

          const event = mod.generateMockEvent({
            mode: "auto",
          })

          handleReconciliation(event)
        }, 900)
      })

      return () => {
        mountedRef.current = false

        if (mockTimerRef.current) {
          clearInterval(mockTimerRef.current)
          mockTimerRef.current = null
        }

        cleanup()
      }
    }

    if (enabled) {
      connect()
    }

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [enabled, connect, cleanup, handleReconciliation])

  return {
    state,
    retry,
    setState,
  }
}
