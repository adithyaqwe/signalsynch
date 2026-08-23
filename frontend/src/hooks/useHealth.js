import { useCallback, useEffect, useRef, useState } from "react"
import { fetchHealth, USE_MOCK_DATA } from "../lib/api.js"

/**
 * Polls GET /health and exposes backend + ML status.
 *
 * States:
 *   status:   "unknown" | "online" | "offline"
 *   modelLoaded: boolean
 *   uptimeSeconds: number | null
 *
 * In mock mode the backend is reported as online/ready without a network call.
 */
export function useHealth({ intervalMs = 5000 } = {}) {
  const [health, setHealth] = useState({
    status: "unknown",
    modelLoaded: false,
    uptimeSeconds: null,
    lastCheck: null,
  })
  const timerRef = useRef(null)
  const mountedRef = useRef(true)

  const check = useCallback(async () => {
    if (USE_MOCK_DATA) {
      if (!mountedRef.current) return
      setHealth((h) => ({
        status: "online",
        modelLoaded: true,
        uptimeSeconds: (h.uptimeSeconds ?? 0) + Math.round(intervalMs / 1000),
        lastCheck: Date.now(),
      }))
      return
    }
    try {
      const data = await fetchHealth()
      if (!mountedRef.current) return
      setHealth({
        status: data && data.status === "ok" ? "online" : "offline",
        modelLoaded: Boolean(data && data.model_loaded),
        uptimeSeconds:
          data && typeof data.uptime_seconds === "number"
            ? data.uptime_seconds
            : null,
        lastCheck: Date.now(),
      })
    } catch {
      if (!mountedRef.current) return
      setHealth((h) => ({
        ...h,
        status: "offline",
        modelLoaded: false,
        lastCheck: Date.now(),
      }))
    }
  }, [intervalMs])

  useEffect(() => {
    mountedRef.current = true
    check()
    timerRef.current = setInterval(check, intervalMs)
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [check, intervalMs])

  return { health, refresh: check }
}
