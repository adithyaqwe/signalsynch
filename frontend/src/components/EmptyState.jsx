import { Inbox } from "lucide-react"

/**
 * Generic empty / loading / error placeholder used across data panels.
 * Keeps a consistent, non-alarming look for LOADING/EMPTY/OFFLINE/ERROR.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  tone = "neutral",
  compact = false,
}) {
  const toneText =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "warn"
        ? "text-[var(--color-warn)]"
        : "text-[var(--color-ink-faint)]"
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center ${
        compact ? "py-6" : "py-10"
      }`}
    >
      <Icon size={compact ? 20 : 26} className={toneText} aria-hidden="true" />
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {message ? (
        <p className="max-w-xs text-xs text-[var(--color-ink-faint)]">
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
