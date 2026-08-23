/**
 * SignalSynch frontend data adapter.
 *
 * The backend and frontend use different field names.
 * This file is the single boundary between them.
 *
 * Backend → Frontend:
 *
 * eventId              → reconciliation_id
 * sensorId             → sensor_id
 * timestamp            → timestamp
 * sourceValues[]       → source_values { A, B, C }
 * trustedValue         → trusted_value
 * status               → ml_label
 * confidence           → ml_confidence
 * requiresHumanReview  → alert
 * reason               → explanation
 */

export const SOURCE_KEYS = ["A", "B", "C"]

export const KNOWN_SENSORS = [
  "sensor_001",
  "sensor_002",
  "sensor_003",
  "sensor_004",
  "sensor_005",
]

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (isFiniteNumber(value)) {
    return value
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value)
  }

  return null
}

function normalizeLabel(status) {
  if (typeof status !== "string") return null

  const normalized = status.toLowerCase().trim()

  if (
    normalized === "consistent" ||
    normalized === "conflicting"
  ) {
    return normalized
  }

  if (normalized === "auto_resolved" || normalized === "conflict_detected" || normalized === "human_review_required") {
    return "conflicting"
  }

  return null
}

function sourceNameToKey(source) {
  if (typeof source !== "string") return null

  const normalized = source
    .toUpperCase()
    .replace(/[\s-]/g, "_")

  if (normalized === "SOURCE_A" || normalized === "A") {
    return "A"
  }

  if (normalized === "SOURCE_B" || normalized === "B") {
    return "B"
  }

  if (normalized === "SOURCE_C" || normalized === "C") {
    return "C"
  }

  return null
}

function normalizeSourceValues(raw) {
  const result = {
    A: null,
    B: null,
    C: null,
  }

  /*
   * Backend shape:
   *
   * [
   *   { source: "SOURCE_A", value: 10 },
   *   { source: "SOURCE_B", value: 10 },
   *   { source: "SOURCE_C", value: 10 }
   * ]
   */
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue

      const key = sourceNameToKey(item.source)

      if (key) {
        result[key] = normalizeNumber(item.value)
      }
    }

    return result
  }

  /*
   * Also support the frontend/mock shape:
   *
   * { A: 10, B: 10, C: 10 }
   */
  if (raw && typeof raw === "object") {
    for (const key of SOURCE_KEYS) {
      result[key] = normalizeNumber(raw[key])
    }
  }

  return result
}

function parseJSON(value) {
  if (typeof value !== "string") return value

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Normalize one backend reconciliation record into the
 * internal shape expected by the existing React UI.
 */
export function normalizeReconciliation(raw) {
  try {
    if (!raw || typeof raw !== "object") {
      return null
    }

    /*
     * Accept both the current backend naming and the
     * existing frontend/mock naming.
     */
    const reconciliation_id =
      raw.eventId ??
      raw.reconciliation_id ??
      raw.id

    const sensor_id =
      raw.sensorId ??
      raw.sensor_id ??
      "—"

    const timestamp =
      raw.timestamp ??
      raw.createdAt ??
      raw.created_at

    if (
      typeof reconciliation_id !== "string" ||
      reconciliation_id.trim() === ""
    ) {
      return null
    }

    if (
      typeof timestamp !== "string" ||
      timestamp.trim() === ""
    ) {
      return null
    }

    const source_values = normalizeSourceValues(
      parseJSON(raw.sourceValues ?? raw.source_values),
    )

    const trusted_value = normalizeNumber(
      raw.trustedValue ??
      raw.trusted_value,
    )

    const ml_label =
      normalizeLabel(raw.status) ??
      normalizeLabel(raw.ml_label)

    /*
     * A reconciliation result needs a valid classification.
     * If the backend is temporarily missing it, ignore the
     * record rather than displaying misleading information.
     */
    if (!ml_label) {
      return null
    }

    let ml_confidence = normalizeNumber(
      raw.confidence ??
      raw.ml_confidence,
    )

    if (ml_confidence === null) {
      return null
    }

    /*
     * Backend confidence should be 0..1.
     */
    ml_confidence = Math.min(
      1,
      Math.max(0, ml_confidence),
    )

    const alert =
      Boolean(raw.requiresHumanReview) ||
      Boolean(raw.alert) ||
      ml_label === "conflicting"

    const explanation =
      typeof raw.reason === "string"
        ? raw.reason
        : typeof raw.explanation === "string"
          ? raw.explanation
          : ""

    return {
      reconciliation_id,
      sensor_id,
      timestamp,
      source_values,
      trusted_value,
      ml_label,
      ml_confidence,
      alert,
      explanation,

      /*
       * Keep useful backend metadata without forcing the
       * existing UI components to understand the backend model.
       */
      conflicting_sources: Array.isArray(raw.conflictingSources)
        ? raw.conflictingSources
        : [],

      requires_human_review: Boolean(
        raw.requiresHumanReview,
      ),

      _ts: Date.parse(timestamp) || Date.now(),
    }
  } catch {
    return null
  }
}

/**
 * Normalize a collection of backend reconciliation records.
 */
export function normalizeReconciliations(raw) {
  if (!Array.isArray(raw)) return []

  return raw
    .map(normalizeReconciliation)
    .filter(Boolean)
}

/**
 * Safe JSON.parse.
 */
export function safeParseJSON(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Normalize an audit record.
 *
 * Audit data can use the same backend naming convention
 * as reconciliation records, so it goes through the
 * same adapter.
 */
export function normalizeAuditRecord(raw) {
  return normalizeReconciliation(raw)
}

/**
 * Parse source values from audit records.
 */
export function parseAuditSourceValues(sourceValuesField) {
  return normalizeSourceValues(
    parseJSON(sourceValuesField),
  )
}

/**
 * Format numeric reading.
 */
export function fmtValue(value, digits = 2) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "—"
  }

  return Number(value).toFixed(digits)
}

/**
 * Format ISO timestamp to HH:MM:SS.
 */
export function fmtTime(iso) {
  const timestamp = Date.parse(iso)

  if (Number.isNaN(timestamp)) {
    return "—"
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * Format ISO timestamp for audit rows.
 */
export function fmtDateTime(iso) {
  const timestamp = Date.parse(iso)

  if (Number.isNaN(timestamp)) {
    return "—"
  }

  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * Format confidence value.
 */
export function fmtConfidence(confidence) {
  if (
    confidence === null ||
    confidence === undefined ||
    Number.isNaN(confidence)
  ) {
    return "—"
  }

  return `${Math.round(confidence * 100)}%`
}