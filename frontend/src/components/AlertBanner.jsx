import { AlertTriangle } from "lucide-react"
import { fmtConfidence, fmtTime } from "../lib/validation.js"

/**
 * High-visibility banner shown ONLY when the latest reconciliation has
 * alert === true. Uses role="alert" + aria-live so screen readers announce
 * conflicts immediately. Communicates via icon + text, not color alone.
 */
export function AlertBanner({ latest }) {
  const show = Boolean(latest && latest.alert)

  if (!show) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="anim-alert mb-5 flex items-start gap-3 rounded-[var(--radius)] border border-[color-mix(in_oklch,var(--color-danger),transparent_45%)] bg-[var(--color-danger-soft)] p-4"
    >
      <span
        className="mt-0.5 grid size-8 flex-none place-items-center rounded-full bg-[color-mix(in_oklch,var(--color-danger),transparent_75%)] text-[var(--color-danger)]"
        aria-hidden="true"
      >
        <AlertTriangle size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold text-[var(--color-danger)]">
            Conflict detected · {latest.sensor_id}
          </p>
          <span className="text-xs text-[var(--color-ink-faint)]">
            {fmtTime(latest.timestamp)} · confidence{" "}
            {fmtConfidence(latest.ml_confidence)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {latest.explanation ||
            "Sources disagree beyond tolerance. A trusted value was reconciled from the consistent sources."}
        </p>
      </div>
    </div>
  )
}
