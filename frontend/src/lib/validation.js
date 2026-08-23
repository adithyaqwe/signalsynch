/**
 * Defensive validation + normalization for reconciliation payloads.
 *
 * The backend contract is authoritative. We never invent business values;
 * we only reject/ignore malformed events and coerce shapes we can trust.
 */

export const SOURCE_KEYS = ["A", "B", "C"]
export const KNOWN_SENSORS = [
  "sensor_001",
  "sensor_002",
  "sensor_003",
  "sensor_004",
  "sensor_005",
]

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v)
}

/** A source value is valid if it is null OR a finite number. */
function normalizeSourceValue(v) {
  if (v === null || v === undefined) return null
  if (isFiniteNumber(v)) return v
  // Some backends may serialize numbers as strings — accept if parseable.
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return null
}

/**
 * Validate and normalize a single reconciliation event.
 * Returns a normalized object on success, or null if the event is malformed.
 * Never throws.
 */
export function normalizeReconciliation(raw) {
  try {
    if (!raw || typeof raw !== "object") return null

    const {
      reconciliation_id,
      sensor_id,
      timestamp,
      source_values,
      trusted_value,
      ml_label,
      ml_confidence,
      alert,
      explanation,
    } = raw

    // Required identity + string fields.
    if (typeof reconciliation_id !== "string" || reconciliation_id === "")
      return null
    if (typeof sensor_id !== "string" || sensor_id === "") return null
    if (typeof timestamp !== "string" || timestamp === "") return null

    // source_values: object (may be a JSON string in audit records — handled
    // separately by parseAuditSourceValues). Here we expect an object.
    let sv = source_values
    if (typeof sv === "string") {
      sv = safeParseJSON(sv)
    }
    if (!sv || typeof sv !== "object") return null

    const normalizedSources = {}
    for (const key of SOURCE_KEYS) {
      normalizedSources[key] = normalizeSourceValue(sv[key])
    }

    // trusted_value must be a finite number per contract.
    const trusted = normalizeSourceValue(trusted_value)

    // ml_label must be one of the two known labels.
    const label =
      ml_label === "consistent" || ml_label === "conflicting"
        ? ml_label
        : null
    if (label === null) return null

    // ml_confidence: number 0..1. Clamp defensively.
    let confidence = normalizeSourceValue(ml_confidence)
    if (confidence === null) return null
    confidence = Math.min(1, Math.max(0, confidence))

    return {
      reconciliation_id,
      sensor_id,
      timestamp,
      source_values: normalizedSources,
      trusted_value: trusted, // may be null if backend omitted; UI shows "—"
      ml_label: label,
      ml_confidence: confidence,
      alert: Boolean(alert),
      explanation:
        typeof explanation === "string" ? explanation : "",
      // parsed for convenience
      _ts: Date.parse(timestamp) || Date.now(),
    }
  } catch {
    return null
  }
}

/** Safe JSON.parse that returns null instead of throwing. */
export function safeParseJSON(str) {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

/**
 * Audit records carry source_values as a JSON STRING. Parse defensively and
 * normalize to the same shape as live events.
 */
export function parseAuditSourceValues(sourceValuesField) {
  let obj = sourceValuesField
  if (typeof obj === "string") obj = safeParseJSON(obj)
  const out = {}
  for (const key of SOURCE_KEYS) {
    out[key] = obj && typeof obj === "object" ? normalizeSourceValue(obj[key]) : null
  }
  return out
}

/** Normalize a full audit record for display. Returns null if unusable. */
export function normalizeAuditRecord(raw) {
  if (!raw || typeof raw !== "object") return null
  if (typeof raw.reconciliation_id !== "string") return null
  return {
    reconciliation_id: raw.reconciliation_id,
    sensor_id: typeof raw.sensor_id === "string" ? raw.sensor_id : "—",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : "",
    source_values: parseAuditSourceValues(raw.source_values),
    trusted_value: normalizeSourceValue(raw.trusted_value),
    ml_label:
      raw.ml_label === "consistent" || raw.ml_label === "conflicting"
        ? raw.ml_label
        : "—",
    ml_confidence: (() => {
      const c = normalizeSourceValue(raw.ml_confidence)
      return c === null ? null : Math.min(1, Math.max(0, c))
    })(),
    alert: Boolean(raw.alert),
    explanation: typeof raw.explanation === "string" ? raw.explanation : "",
  }
}

/** Format a numeric reading; null → em dash. */
export function fmtValue(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—"
  return Number(v).toFixed(digits)
}

/** Format ISO timestamp to HH:MM:SS (local). Falls back gracefully. */
export function fmtTime(iso) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "—"
  const d = new Date(t)
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/** Format ISO timestamp to a fuller date-time for audit rows. */
export function fmtDateTime(iso) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return "—"
  const d = new Date(t)
  return d.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function fmtConfidence(c) {
  if (c === null || c === undefined || Number.isNaN(c)) return "—"
  return `${Math.round(c * 100)}%`
}
