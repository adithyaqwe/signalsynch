import { AlertTriangle, WifiOff } from "lucide-react"
import { Card, LiveDot } from "./ui.jsx"
import { StreamChart, SOURCE_COLOR } from "./StreamChart.jsx"
import { EmptyState } from "./EmptyState.jsx"
import { fmtValue, fmtTime, SOURCE_KEYS } from "../lib/validation.js"

const SOURCE_META = {
  A: { label: "Source A", color: SOURCE_COLOR.A, tone: "info" },
  B: { label: "Source B", color: SOURCE_COLOR.B, tone: "ok" },
  C: { label: "Source C", color: SOURCE_COLOR.C, tone: "warn" },
}

/** One source panel: current reading + timestamp + its own line chart. */
function SourcePanel({ srcKey, latest, chartData }) {
  const meta = SOURCE_META[srcKey]
  const value = latest ? latest.source_values[srcKey] : null
  const isNull = value === null
  const ts = latest ? latest.timestamp : null

  return (
    <Card className="flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="dot"
            style={{ background: meta.color }}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {meta.label}
          </h3>
        </div>
        {isNull ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-warn)]">
            <AlertTriangle size={12} aria-hidden="true" /> No signal
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className="tabnum text-3xl font-semibold tracking-tight text-[var(--color-ink)]"
          aria-label={`${meta.label} reading`}
        >
          {fmtValue(value)}
        </span>
        {!isNull ? (
          <span className="text-sm text-[var(--color-ink-faint)]">°C</span>
        ) : null}
      </div>
      <div className="mb-2 mt-0.5 text-xs text-[var(--color-ink-faint)]">
        {ts ? fmtTime(ts) : "awaiting data"}
      </div>

      <div className="mt-auto">
        <StreamChart
          data={chartData}
          series={[srcKey]}
          height={96}
          ariaLabel={`${meta.label} trend, latest ${fmtValue(value)} degrees.`}
        />
      </div>
    </Card>
  )
}

/**
 * Live source monitoring: three source panels + a unified comparison chart
 * with the trusted value as a reference line.
 */
export function LiveStreams({ latest, chartData, backendOffline, hasData }) {
  if (backendOffline && !hasData) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title="Backend unavailable"
          message="Retrying connection… live source readings will resume automatically."
        />
      </Card>
    )
  }

  if (!hasData) {
    return (
      <Card className="p-4">
        <EmptyState
          title="No stream data yet"
          message="Waiting for the first reconciliation event from the selected scope."
          compact
        />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SOURCE_KEYS.map((k) => (
          <SourcePanel
            key={k}
            srcKey={k}
            latest={latest}
            chartData={chartData}
          />
        ))}
      </div>

      {/* Unified comparison */}
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LiveDot tone="brand" />
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">
              Unified Comparison
            </h3>
          </div>
          <ul className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-ink-muted)]">
            {SOURCE_KEYS.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span
                  className="dot"
                  style={{ background: SOURCE_COLOR[k] }}
                  aria-hidden="true"
                />
                Source {k}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded"
                style={{ background: SOURCE_COLOR.trusted }}
                aria-hidden="true"
              />
              Trusted
            </li>
          </ul>
        </div>
        <StreamChart
          data={chartData}
          series={SOURCE_KEYS}
          showTrusted
          height={220}
          ariaLabel="Unified comparison of all sources against the trusted reconciled value."
        />
      </Card>
    </div>
  )
}
