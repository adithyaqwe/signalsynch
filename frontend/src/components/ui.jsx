/**
 * Small shared presentational primitives for the SignalSynch console.
 * Kept intentionally minimal — no external UI framework.
 */

export function cn(...parts) {
  return parts.filter(Boolean).join(" ")
}

/** Panel/card surface with subtle border + restrained shadow. */
export function Card({ as: Tag = "section", className, children, ...rest }) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius)] border border-[var(--color-border)]",
        "bg-[var(--color-surface)] shadow-[0_1px_0_0_rgba(255,255,255,0.02),0_8px_24px_-16px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Section label with optional trailing content. */
export function SectionHeader({ title, hint, right, id }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2
          id={id}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]"
        >
          {title}
        </h2>
        {hint ? (
          <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">{hint}</p>
        ) : null}
      </div>
      {right}
    </div>
  )
}

const TONE = {
  ok: {
    text: "text-[var(--color-ok)]",
    bg: "bg-[var(--color-ok-soft)]",
    ring: "ring-[color-mix(in_oklch,var(--color-ok),transparent_60%)]",
    dot: "bg-[var(--color-ok)]",
  },
  warn: {
    text: "text-[var(--color-warn)]",
    bg: "bg-[var(--color-warn-soft)]",
    ring: "ring-[color-mix(in_oklch,var(--color-warn),transparent_60%)]",
    dot: "bg-[var(--color-warn)]",
  },
  danger: {
    text: "text-[var(--color-danger)]",
    bg: "bg-[var(--color-danger-soft)]",
    ring: "ring-[color-mix(in_oklch,var(--color-danger),transparent_55%)]",
    dot: "bg-[var(--color-danger)]",
  },
  info: {
    text: "text-[var(--color-info)]",
    bg: "bg-[var(--color-info-soft)]",
    ring: "ring-[color-mix(in_oklch,var(--color-info),transparent_60%)]",
    dot: "bg-[var(--color-info)]",
  },
  brand: {
    text: "text-[var(--color-brand)]",
    bg: "bg-[var(--color-brand-soft)]",
    ring: "ring-[color-mix(in_oklch,var(--color-brand),transparent_60%)]",
    dot: "bg-[var(--color-brand)]",
  },
  neutral: {
    text: "text-[var(--color-ink-muted)]",
    bg: "bg-[var(--color-surface-2)]",
    ring: "ring-[var(--color-border)]",
    dot: "bg-[var(--color-ink-faint)]",
  },
}

/**
 * Status badge — always pairs color with a text label + optional icon so
 * status is never communicated by color alone (WCAG).
 */
export function Badge({ tone = "neutral", icon: Icon, children, className, dot }) {
  const t = TONE[tone] || TONE.neutral
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-xs font-semibold ring-1 ring-inset",
        t.text,
        t.bg,
        t.ring,
        className,
      )}
    >
      {dot ? <span className={cn("dot", t.dot)} aria-hidden="true" /> : null}
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

/** A pulsing live indicator dot with accessible label handled by parent. */
export function LiveDot({ tone = "ok" }) {
  const t = TONE[tone] || TONE.ok
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <span className={cn("dot", t.dot)} />
      <span className={cn("dot dot-live absolute", t.dot)} />
    </span>
  )
}

export const TONE_KEYS = Object.keys(TONE)
