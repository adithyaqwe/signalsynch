import { Cpu, Server, Signal } from "lucide-react"
import { Badge } from "./ui.jsx"

/**
 * Header cluster of global system-health indicators.
 * These reflect the WHOLE system and must not be affected by sensor filtering.
 */
export function SystemStatus({ health, activeSources }) {
  const backendOnline = health.status === "online"
  const mlReady = backendOnline && health.modelLoaded

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="System health"
    >
      <Badge
        tone={backendOnline ? "ok" : health.status === "unknown" ? "neutral" : "danger"}
        icon={Server}
        dot={backendOnline}
      >
        Backend {backendOnline ? "Online" : health.status === "unknown" ? "…" : "Offline"}
      </Badge>

      <Badge
        tone={mlReady ? "ok" : "warn"}
        icon={Cpu}
        dot={mlReady}
      >
        ML {mlReady ? "Ready" : "Not Ready"}
      </Badge>

      <Badge
        tone={activeSources > 0 ? "brand" : "neutral"}
        icon={Signal}
      >
        {activeSources}/3 Sources Active
      </Badge>
    </div>
  )
}
