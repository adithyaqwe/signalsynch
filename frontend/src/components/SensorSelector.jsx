import { KNOWN_SENSORS } from "../lib/validation.js"
import { cn } from "./ui.jsx"

/**
 * Sensor filter. "All" shows aggregate; a specific sensor scopes charts,
 * current reconciliation, and history — but NOT global system health.
 *
 * Implemented as an accessible radio group (tablist-like) with keyboard
 * arrow navigation handled by native focus + click.
 */
export function SensorSelector({ value, onChange, counts = {} }) {
  const options = ["all", ...KNOWN_SENSORS]

  return (
    <div
      role="group"
      aria-label="Filter by sensor"
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((opt) => {
        const selected = value === opt
        const label = opt === "all" ? "All Sensors" : opt.replace("sensor_", "Sensor ")
        const count = opt === "all" ? undefined : counts[opt]
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              selected
                ? "border-[color-mix(in_oklch,var(--color-brand),transparent_45%)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]",
            )}
          >
            {label}
            {typeof count === "number" && count > 0 ? (
              <span className="tabnum rounded-full bg-[var(--color-surface-2)] px-1.5 text-[10px] text-[var(--color-ink-faint)]">
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
