import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import { fmtValue, fmtTime } from "../lib/validation.js"

/**
 * Small sparkline-style line chart for one source (or unified comparison).
 *
 * - X axis: time; Y axis: reading.
 * - `connectNulls={false}` so null readings create GAPS (never treated as 0).
 * - Animation disabled to stay performant under continuous data and to respect
 *   reduced-motion (chart entrance animation is a non-essential effect).
 */

const SOURCE_COLOR = {
  A: "var(--color-src-a)",
  B: "var(--color-src-b)",
  C: "var(--color-src-c)",
  trusted: "var(--color-trusted)",
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-xs shadow-lg">
      <div className="mb-1 text-[var(--color-ink-faint)]">{fmtTime(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="dot"
            style={{ background: p.color }}
            aria-hidden="true"
          />
          <span className="text-[var(--color-ink-muted)]">{p.name}</span>
          <span className="tabnum ml-auto font-medium text-[var(--color-ink)]">
            {fmtValue(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function StreamChart({
  data,
  series = ["A", "B", "C"],
  showTrusted = false,
  height = 120,
  ariaLabel,
}) {
  // Build a concise text summary for screen readers.
  const summary = useMemo(() => {
    if (!data || data.length === 0) return "No chart data."
    const last = data[data.length - 1]
    const parts = series
      .map((s) => `Source ${s}: ${fmtValue(last[s])}`)
      .join(", ")
    const trusted = showTrusted ? `, Trusted: ${fmtValue(last.trusted)}` : ""
    return `${data.length} points. Latest — ${parts}${trusted}.`
  }, [data, series, showTrusted])

  return (
    <figure className="m-0">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 6, right: 6, bottom: 0, left: -18 }}
          >
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={fmtTime}
              tick={{ fontSize: 10, fill: "var(--color-ink-faint)" }}
              stroke="var(--color-border-strong)"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-ink-faint)" }}
              stroke="var(--color-border-strong)"
              width={44}
              domain={["auto", "auto"]}
              tickFormatter={(v) => fmtValue(v, 0)}
            />
            <Tooltip content={<ChartTooltip />} />
            {showTrusted ? (
              <Line
                type="monotone"
                dataKey="trusted"
                name="Trusted"
                stroke={SOURCE_COLOR.trusted}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            ) : null}
            {series.map((s) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                name={`Source ${s}`}
                stroke={SOURCE_COLOR[s]}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{ariaLabel || summary}</figcaption>
    </figure>
  )
}

export { SOURCE_COLOR }
