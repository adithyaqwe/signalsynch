import { Lightbulb, MessageSquareText } from "lucide-react"
import { Card, SectionHeader, Badge } from "./ui.jsx"
import { EmptyState } from "./EmptyState.jsx"
import { fmtConfidence } from "../lib/validation.js"

/**
 * Human-readable explanation of the current reconciliation decision.
 * Renders the backend-provided `explanation` verbatim (never invented) plus
 * the ML label + confidence for context.
 */
export function ExplanationPanel({ latest }) {
  const conflicting = latest && latest.ml_label === "conflicting"
  return (
    <Card className="flex h-full flex-col p-4 md:p-5">
      <SectionHeader
        title="Decision Explanation"
        hint="Why this reconciliation was labeled"
      />

      {!latest ? (
        <EmptyState
          icon={MessageSquareText}
          title="No decision yet"
          message="Explanations appear once a reconciliation is received."
          compact
        />
      ) : (
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {conflicting ? (
              <Badge tone="danger">Conflicting</Badge>
            ) : (
              <Badge tone="ok">Consistent</Badge>
            )}
            <Badge tone="info">
              Confidence {fmtConfidence(latest.ml_confidence)}
            </Badge>
          </div>

          <div className="flex flex-1 items-start gap-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3.5">
            <span
              className="mt-0.5 flex-none text-[var(--color-warn)]"
              aria-hidden="true"
            >
              <Lightbulb size={16} />
            </span>
            <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {latest.explanation || "No explanation was provided for this event."}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
