import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Header } from "./components/Header.jsx"
import { SensorSelector } from "./components/SensorSelector.jsx"
import { LiveStreams } from "./components/LiveStreams.jsx"
import { ReconciliationPanel } from "./components/ReconciliationPanel.jsx"
import { AlertBanner } from "./components/AlertBanner.jsx"
import { ExplanationPanel } from "./components/ExplanationPanel.jsx"
import { AuditLog } from "./components/AuditLog.jsx"
import { SectionHeader } from "./components/ui.jsx"
import { useHealth } from "./hooks/useHealth.js"
import { useSSE, SSE_STATE } from "./hooks/useSSE.js"
import { usePollingFallback } from "./hooks/usePollingFallback.js"
import { SOURCE_KEYS } from "./lib/validation.js"
import { USE_MOCK_DATA } from "./lib/api.js"

const MAX_HISTORY = 300 // total events retained across all sensors
const CHART_WINDOW = 45 // points per source chart (rolling)
const SSE_RETRY_WHILE_POLLING_MS = 15000

export default function App() {
  const { health } = useHealth({ intervalMs: 5000 })

  // Full recent event history (newest first), deduped by reconciliation_id.
  const [events, setEvents] = useState([])
  const seenIdsRef = useRef(new Set())

  const [selectedSensor, setSelectedSensor] = useState("all")

  // Ingest one normalized event (from SSE or polling). Dedup + bound.
  const ingest = useCallback((evt) => {
    if (!evt || seenIdsRef.current.has(evt.reconciliation_id)) return
    seenIdsRef.current.add(evt.reconciliation_id)
    setEvents((prev) => {
      const next = [evt, ...prev]
      if (next.length > MAX_HISTORY) {
        const removed = next.splice(MAX_HISTORY)
        for (const r of removed) seenIdsRef.current.delete(r.reconciliation_id)
      }
      return next
    })
  }, [])

  const ingestMany = useCallback(
    (list) => {
      // API returns newest-first; insert oldest-first so ordering is correct.
      for (let i = list.length - 1; i >= 0; i--) ingest(list[i])
    },
    [ingest],
  )

  // SSE primary channel.
  const { state: sseState, retry } = useSSE({ enabled: true, onEvent: ingest })

  // Polling only while SSE is in fallback.
  const pollingActive = sseState === SSE_STATE.FALLBACK_POLLING
  usePollingFallback({
    active: pollingActive,
    intervalMs: 2000,
    limit: 20,
    onEvents: ingestMany,
  })

  // While polling, periodically attempt to restore SSE.
  useEffect(() => {
    if (!pollingActive) return
    const id = setInterval(retry, SSE_RETRY_WHILE_POLLING_MS)
    return () => clearInterval(id)
  }, [pollingActive, retry])

  // ---- Derived, memoized selections -------------------------------------

  // Events scoped to the selected sensor.
  const scopedEvents = useMemo(() => {
    if (selectedSensor === "all") return events
    return events.filter((e) => e.sensor_id === selectedSensor)
  }, [events, selectedSensor])

  // Latest reconciliation for the current scope.
  const latest = scopedEvents[0] || null

  // Per-sensor event counts (for selector badges).
  const sensorCounts = useMemo(() => {
    const c = {}
    for (const e of events) c[e.sensor_id] = (c[e.sensor_id] || 0) + 1
    return c
  }, [events])

  // Active source count from the latest reconciliation (non-null sources).
  const activeSources = useMemo(() => {
    if (!latest) return 0
    return SOURCE_KEYS.reduce(
      (n, k) => n + (latest.source_values[k] !== null ? 1 : 0),
      0,
    )
  }, [latest])

  // Rolling per-source chart series (chronological). Built from scoped events.
  const chartData = useMemo(() => {
    // Take the most recent CHART_WINDOW scoped events, oldest→newest.
    const window = scopedEvents.slice(0, CHART_WINDOW).reverse()
    return window.map((e) => ({
      id: e.reconciliation_id,
      t: e._ts,
      A: e.source_values.A,
      B: e.source_values.B,
      C: e.source_values.C,
      trusted: e.trusted_value,
      alert: e.alert,
    }))
  }, [scopedEvents])

  const backendOffline = health.status === "offline"
  const hasData = events.length > 0

  return (
    <div className="min-h-full">
      <Header
        health={health}
        sseState={sseState}
        activeSources={activeSources}
        mockMode={USE_MOCK_DATA}
      />

      {/* aria-live region for connection + alert changes handled in children */}
      <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-6">
        {/* Controls */}
        <div className="mb-5">
          <SectionHeader
            title="Sensor Scope"
            hint="Filter live view & history. System health stays global."
          />
          <SensorSelector
            value={selectedSensor}
            onChange={setSelectedSensor}
            counts={sensorCounts}
          />
        </div>

        {/* Alert (only when active) */}
        <AlertBanner latest={latest} />

        {/* Reconciliation + Explanation */}
        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ReconciliationPanel
              latest={latest}
              backendOffline={backendOffline}
              hasData={hasData}
            />
          </div>
          <div>
            <ExplanationPanel latest={latest} />
          </div>
        </div>

        {/* Live source monitoring */}
        <div className="mb-6">
          <SectionHeader
            title="Live Source Monitoring"
            hint={
              selectedSensor === "all"
                ? "Aggregated stream across sensors"
                : selectedSensor.replace("sensor_", "Sensor ")
            }
          />
          <LiveStreams
            latest={latest}
            chartData={chartData}
            backendOffline={backendOffline}
            hasData={scopedEvents.length > 0}
          />
        </div>

        {/* Audit log */}
        <div className="mb-10">
          <AuditLog />
        </div>

        <footer className="border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-ink-faint)]">
          SignalSynch operator console · retains last {MAX_HISTORY} events in
          memory · charts window {CHART_WINDOW} points
        </footer>
      </main>
    </div>
  )
}
