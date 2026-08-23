import { Activity, WifiOff, RefreshCw, Radio, Loader2 } from "lucide-react"
import { SSE_STATE } from "../hooks/useSSE.js"
import { Badge } from "./ui.jsx"

/**
 * Compact live-stream connection indicator. Maps the SSE state machine to a
 * human label + tone + icon. Never color-only.
 */
const MAP = {
  [SSE_STATE.CONNECTING]: {
    tone: "info",
    icon: Loader2,
    label: "Connecting",
    spin: true,
  },
  [SSE_STATE.CONNECTED]: {
    tone: "ok",
    icon: Radio,
    label: "Live Stream Connected",
    dot: true,
  },
  [SSE_STATE.RECONNECTING]: {
    tone: "warn",
    icon: RefreshCw,
    label: "Reconnecting",
    spin: true,
  },
  [SSE_STATE.ERROR]: {
    tone: "warn",
    icon: RefreshCw,
    label: "Stream Retry",
    spin: true,
  },
  [SSE_STATE.FALLBACK_POLLING]: {
    tone: "warn",
    icon: Activity,
    label: "Polling Fallback Active",
  },
}

export function ConnectionStatus({ state, backendOffline }) {
  if (backendOffline) {
    return (
      <Badge tone="danger" icon={WifiOff}>
        Stream Offline
      </Badge>
    )
  }
  const cfg = MAP[state] || MAP[SSE_STATE.CONNECTING]
  const Icon = cfg.icon
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <Badge tone={cfg.tone} dot={cfg.dot}>
        <Icon
          size={13}
          aria-hidden="true"
          className={cfg.spin ? "animate-spin" : undefined}
        />
        {cfg.label}
      </Badge>
    </span>
  )
}
