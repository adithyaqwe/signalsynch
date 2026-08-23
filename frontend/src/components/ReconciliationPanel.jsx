import { CheckCircle2, GitCompareArrows, ShieldCheck, WifiOff } from "lucide-react"
import { Card, Badge, SectionHeader } from "./ui.jsx"
import { EmptyState } from "./EmptyState.jsx"
import { StreamChart, SOURCE_COLOR } from "./StreamChart.jsx"
import { SOURCE_KEYS, fmtValue, fmtConfidence, fmtTime } from "../lib/validation.js"

/**
 * The centerpiece: current reconciliation for the selected scope.
 * Shows each source reading, the trusted reconciled value, ML label, and
 * confidence — with a confidence meter. Handles conflict vs consistent.
 */

function ConfidenceMeter({ value, conflicting }) {
  const pct = value === null ? 0 : Math.round(value * 100)
  const tone = conflicting ? "var(--color-danger)" : "var(--color-ok)"
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--color-ink-faint)]">ML confidence</span>
        <span className="tabnum font-semibold text-[var(--color-ink)]">
          {fmtConfidence(value)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="ML confidence"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: tone }}
        />
      </div>
    </div>
  )
}

function SourceReading({ srcKey, value, trusted, conflicting }) {
  const isNull = value === null
  // Flag the source that deviates most from trusted when conflicting.
  const deviation =
    !isNull && trusted !== null ? Math.abs(value - trusted) : null

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="dot"
          style={{ background: SOURCE_COLOR[srcKey] }}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">
          Source {srcKey}
        </span>
      </div>
      <div className="tabnum text-2xl font-semibold text-[var(--color-ink)]">
        {fmtValue(value)}
      </div>
      <div className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
        {isNull
          ? "no signal"
          : deviation !== null
            ? `Δ ${fmtValue(deviation)} vs trusted`
            : "—"}
      </div>
    </div>
  )
}

export function ReconciliationPanel({ latest, backendOffline, hasData }) {
  return (
    <Card className="flex h-full flex-col p-4 md:p-5">
      <SectionHeader
        title="Current Reconciliation"
        hint="Latest ML-labeled result for the selected scope"
        right={
          latest ? (
            latest.ml_label === "conflicting" ? (
              <Badge tone="danger" icon={GitCompareArrows}>
                Conflicting
              </Badge>
            ) : (
              <Badge tone="ok" icon={CheckCircle2}>
                Consistent
              </Badge>
            )
          ) : null
        }
      />

      {backendOffline && !hasData ? (
        <EmptyState
          icon={WifiOff}
          tone="danger"
          title="Backend unavailable"
          message="Reconciliation will resume when the stream reconnects."
        />
      ) : !latest ? (
        <EmptyState
          title="Awaiting first reconciliation"
          message="No events for the selected scope yet."
          compact
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          {/* Source readings */}
          <div className="grid grid-cols-3 gap-2.5">
            {SOURCE_KEYS.map((k) => (
              <SourceReading
                key={k}
                srcKey={k}
                value={latest.source_values[k]}
                trusted={latest.trusted_value}
                conflicting={latest.ml_label === "conflicting"}
              />
            ))}
          </div>

          {/* Trusted value — the reconciled output */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[color-mix(in_oklch,var(--color-trusted),transparent_55%)] bg-[color-mix(in_oklch,var(--color-trusted),transparent_88%)] p-3.5">
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-9 place-items-center rounded-full text-[var(--color-trusted)]"
                style={{
                  background:
                    "color-mix(in oklch, var(--color-trusted), transparent 80%)",
                }}
                aria-hidden="true"
              >
                <ShieldCheck size={18} />
              </span>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Trusted Value
                </div>
                <div className="tabnum text-2xl font-semibold text-[var(--color-ink)]">
                  {fmtValue(latest.trusted_value)}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-[var(--color-ink-faint)]">
              <div>{latest.sensor_id}</div>
              <div>{fmtTime(latest.timestamp)}</div>
            </div>
          </div>

          <ConfidenceMeter
            value={latest.ml_confidence}
            conflicting={latest.ml_label === "conflicting"}
          />
        </div>
      )}
    </Card>
  )
}
