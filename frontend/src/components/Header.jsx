import { Waypoints } from "lucide-react"
import { SystemStatus } from "./SystemStatus.jsx"
import { ConnectionStatus } from "./ConnectionStatus.jsx"

/**
 * Sticky application header. Always communicates identity + global health +
 * live stream connection state at a glance.
 */
export function Header({ health, sseState, activeSources, mockMode }) {
  const backendOffline = health.status === "offline"
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-canvas),transparent_15%)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-inset ring-[color-mix(in_oklch,var(--color-brand),transparent_65%)]"
            aria-hidden="true"
          >
            <Waypoints size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold leading-none tracking-tight text-[var(--color-ink)]">
                SignalSynch
              </h1>
              {mockMode ? (
                <span className="rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Mock
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
              Real-Time Reconciliation Console
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SystemStatus health={health} activeSources={activeSources} />
          <ConnectionStatus state={sseState} backendOffline={backendOffline} />
        </div>
      </div>
    </header>
  )
}
