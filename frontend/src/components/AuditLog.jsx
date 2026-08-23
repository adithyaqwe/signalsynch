import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  History,
  RefreshCw,
  ServerCrash,
} from "lucide-react"
import { Card, Badge, SectionHeader, cn } from "./ui.jsx"
import { EmptyState } from "./EmptyState.jsx"
import { useAudit } from "../hooks/useAudit.js"
import { SOURCE_COLOR } from "./StreamChart.jsx"
import {
  SOURCE_KEYS,
  KNOWN_SENSORS,
  fmtValue,
  fmtConfidence,
  fmtDateTime,
} from "../lib/validation.js"

const LABEL_FILTERS = [
  { key: "all", label: "All" },
  { key: "conflicting", label: "Conflicts" },
  { key: "consistent", label: "Consistent" },
]

function LabelBadge({ label }) {
  if (label === "conflicting")
    return (
      <Badge tone="danger" icon={GitCompareArrows}>
        Conflicting
      </Badge>
    )
  if (label === "consistent")
    return (
      <Badge tone="ok" icon={CheckCircle2}>
        Consistent
      </Badge>
    )
  return <Badge tone="neutral">—</Badge>
}

/** Expandable detail row content. */
function AuditDetail({ rec }) {
  return (
    <div className="grid grid-cols-1 gap-4 bg-[var(--color-surface-2)] px-4 py-4 md:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          Source values
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SOURCE_KEYS.map((k) => (
            <div
              key={k}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            >
              <div className="mb-0.5 flex items-center gap-1.5 text-xs text-[var(--color-ink-faint)]">
                <span
                  className="dot"
                  style={{ background: SOURCE_COLOR[k] }}
                  aria-hidden="true"
                />
                {k}
              </div>
              <div className="tabnum text-sm font-semibold text-[var(--color-ink)]">
                {fmtValue(rec.source_values[k])}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div>
            <div className="text-xs text-[var(--color-ink-faint)]">Trusted</div>
            <div className="tabnum text-sm font-semibold text-[var(--color-trusted)]">
              {fmtValue(rec.trusted_value)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-ink-faint)]">
              Confidence
            </div>
            <div className="tabnum text-sm font-semibold text-[var(--color-ink)]">
              {fmtConfidence(rec.ml_confidence)}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          Explanation
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {rec.explanation || "No explanation recorded."}
        </p>
        <div className="mt-3 break-all font-mono text-xs text-[var(--color-ink-faint)]">
          id: {rec.reconciliation_id}
        </div>
      </div>
    </div>
  )
}

function AuditRow({ rec }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className={cn(
          "border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-2)]",
          rec.alert && "bg-[color-mix(in_oklch,var(--color-danger),transparent_92%)]",
        )}
      >
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Collapse row" : "Expand row"}
            className="inline-flex items-center gap-1.5 text-left text-sm font-medium text-[var(--color-ink)]"
          >
            <ChevronDown
              size={14}
              className={cn(
                "text-[var(--color-ink-faint)] transition-transform",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
            <span className="tabnum">{fmtDateTime(rec.timestamp)}</span>
          </button>
        </td>
        <td className="px-3 py-2.5 text-sm text-[var(--color-ink-muted)]">
          {rec.sensor_id}
        </td>
        <td className="hidden px-3 py-2.5 sm:table-cell">
          <div className="flex items-center gap-2.5 text-sm">
            {SOURCE_KEYS.map((k) => (
              <span key={k} className="tabnum text-[var(--color-ink-muted)]">
                <span
                  className="mr-1 inline-block size-1.5 rounded-full align-middle"
                  style={{ background: SOURCE_COLOR[k] }}
                  aria-hidden="true"
                />
                {fmtValue(rec.source_values[k])}
              </span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2.5 tabnum text-sm font-semibold text-[var(--color-trusted)]">
          {fmtValue(rec.trusted_value)}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <LabelBadge label={rec.ml_label} />
            {rec.alert ? (
              <AlertTriangle
                size={14}
                className="text-[var(--color-danger)]"
                aria-label="Alert raised"
              />
            ) : null}
          </div>
        </td>
        <td className="hidden px-3 py-2.5 tabnum text-sm text-[var(--color-ink-muted)] md:table-cell">
          {fmtConfidence(rec.ml_confidence)}
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={6} className="p-0">
            <AuditDetail rec={rec} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

/**
 * Historical audit log. Server-paginated via /audit; label + sensor filters
 * applied client-side to the current page. Handles loading / error / empty.
 */
export function AuditLog() {
  const { records, status, error, page, totalPages, total, setPage, reload } =
    useAudit({ limit: 25 })

  const [labelFilter, setLabelFilter] = useState("all")
  const [sensorFilter, setSensorFilter] = useState("all")

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (labelFilter !== "all" && r.ml_label !== labelFilter) return false
      if (sensorFilter !== "all" && r.sensor_id !== sensorFilter) return false
      return true
    })
  }, [records, labelFilter, sensorFilter])

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-border)] p-4 md:p-5">
        <SectionHeader
          title="Audit Log"
          hint="Full reconciliation history · newest first"
          right={
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]"
            >
              <RefreshCw
                size={13}
                className={status === "loading" ? "animate-spin" : undefined}
                aria-hidden="true"
              />
              Refresh
            </button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter by label"
            className="flex items-center gap-1"
          >
            {LABEL_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={labelFilter === f.key}
                onClick={() => setLabelFilter(f.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  labelFilter === f.key
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                    : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 text-xs text-[var(--color-ink-faint)]">
            Sensor
            <select
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-ink)]"
            >
              <option value="all">All</option>
              {KNOWN_SENSORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Body */}
      {status === "error" ? (
        <EmptyState
          icon={ServerCrash}
          tone="danger"
          title="Couldn't load audit log"
          message={error}
          action={
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand)]"
            >
              <RefreshCw size={13} aria-hidden="true" /> Retry
            </button>
          }
        />
      ) : status === "loading" && records.length === 0 ? (
        <div className="p-4">
          <SkeletonRows />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No matching records"
          message="Try adjusting the label or sensor filters."
        />
      ) : (
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-ink-faint)]">
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Timestamp
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Sensor
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 font-semibold sm:table-cell"
                >
                  Sources (A / B / C)
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Trusted
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Label
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 font-semibold md:table-cell"
                >
                  Conf.
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => (
                <AuditRow key={rec.reconciliation_id} rec={rec} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] px-4 py-3">
        <p className="text-xs text-[var(--color-ink-faint)]">
          Page <span className="tabnum">{page}</span> of{" "}
          <span className="tabnum">{totalPages}</span>
          {total ? (
            <>
              {" "}
              · <span className="tabnum">{total}</span> records
            </>
          ) : null}
          {filtered.length !== records.length ? (
            <> · {filtered.length} shown after filter</>
          ) : null}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1 || status === "loading"}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition-colors enabled:hover:border-[var(--color-border-strong)] enabled:hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} aria-hidden="true" /> Prev
          </button>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || status === "loading"}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition-colors enabled:hover:border-[var(--color-border-strong)] enabled:hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-9 animate-pulse rounded-md bg-[var(--color-surface-2)]"
        />
      ))}
      <span className="sr-only">Loading audit records…</span>
    </div>
  )
}
