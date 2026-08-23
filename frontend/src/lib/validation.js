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
 * status / decision    → ml_label
 * confidence           → ml_confidence
 * requiresHumanReview  → alert / requires_human_review
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

export function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

export function normalizeNumber(value) {
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

export function normalizeLabel(raw) {
  if (typeof raw !== "string") return null

  const normalized = raw.toLowerCase().trim()

  if (
    normalized === "consistent" ||
    normalized === "event_analyzed"
  ) {
    return "consistent"
  }

  if (
    normalized === "conflicting" ||
    normalized === "auto_resolved" ||
    normalized === "conflict_detected" ||
    normalized === "human_review_required" ||
    normalized === "conflict"
  ) {
    return "conflicting"
  }

  return null
}

export function sourceNameToKey(source) {
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

export function parseJSON(value) {
  if (typeof value !== "string") return value

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function safeParseJSON(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function normalizeSourceValues(raw) {
  const result = {
    A: null,
    B: null,
    C: null,
  }

  if (!raw) return result

  let parsed = raw
  if (typeof raw === "string") {
    parsed = parseJSON(raw)
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue

      const key = sourceNameToKey(item.source)

      if (key) {
        result[key] = normalizeNumber(item.value)
      }
    }

    return result
  }

  if (parsed && typeof parsed === "object") {
    for (const key of SOURCE_KEYS) {
      result[key] = normalizeNumber(parsed[key])
    }
  }

  return result
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
 * Normalize one backend reconciliation record into the
 * internal shape expected by the existing React UI.
 */
export function normalizeReconciliation(raw) {
  try {
    if (!raw || typeof raw !== "object") {
      return null
    }

    const reconciliation_id =
      raw.reconciliation_id ??
      raw.eventId ??
      raw.id ??
      (raw._id != null ? String(raw._id) : null)

    const sensor_id =
      raw.sensor_id ??
      raw.sensorId ??
      "—"

    const rawTs =
      raw.timestamp ??
      raw.createdAt ??
      raw.created_at ??
      raw.updatedAt

    const tsDate = rawTs ? new Date(rawTs) : new Date()
    const timestamp = !isNaN(tsDate.getTime())
      ? tsDate.toISOString()
      : new Date().toISOString()
    const _ts = !isNaN(tsDate.getTime()) ? tsDate.getTime() : Date.now()

    if (
      typeof reconciliation_id !== "string" ||
      reconciliation_id.trim() === ""
    ) {
      return null
    }

    const source_values = normalizeSourceValues(
      raw.source_values ?? raw.sourceValues,
    )

    const trusted_value = normalizeNumber(
      raw.trusted_value ??
      raw.trustedValue,
    )

    const mlResult =
      raw.mlResult && typeof raw.mlResult === "object"
        ? raw.mlResult
        : {}

    const ml_label =
      normalizeLabel(raw.status) ??
      normalizeLabel(raw.ml_label) ??
      normalizeLabel(raw.decision) ??
      normalizeLabel(mlResult.status) ??
      normalizeLabel(raw.action) ??
      "consistent"

    let ml_confidence = normalizeNumber(
      raw.confidence ??
      raw.ml_confidence ??
      mlResult.confidence,
    )

    if (ml_confidence !== null) {
      if (ml_confidence > 1 && ml_confidence <= 100) {
        ml_confidence = ml_confidence / 100
      }
      ml_confidence = Math.min(1, Math.max(0, ml_confidence))
    }

    const requires_human_review = Boolean(
      raw.requires_human_review ??
      raw.requiresHumanReview ??
      (raw.status === "HUMAN_REVIEW_REQUIRED" || raw.decision === "HUMAN_REVIEW_REQUIRED"),
    )

    const alert =
      typeof raw.alert === "boolean"
        ? raw.alert
        : requires_human_review ||
          raw.status === "CONFLICT_DETECTED" ||
          raw.decision === "CONFLICT_DETECTED" ||
          ml_label === "conflicting"

    const explanation =
      typeof raw.explanation === "string"
        ? raw.explanation
        : typeof raw.reason === "string"
          ? raw.reason
          : ""

    const conflicting_sources = Array.isArray(raw.conflicting_sources)
      ? raw.conflicting_sources
      : Array.isArray(raw.conflictingSources)
        ? raw.conflictingSources
        : Array.isArray(mlResult.conflictingSources)
          ? mlResult.conflictingSources
          : []

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
      conflicting_sources,
      requires_human_review,
      _ts,
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
 * Dedicated normalizer for backend AuditLog records.
 *
 * Backend AuditLog schema:
 * - eventId
 * - action
 * - decision
 * - trustedValue
 * - reason
 * - mlResult { status, confidence, conflictingSources }
 * - timestamp
 */
export function normalizeAuditRecord(raw) {
  try {
    if (!raw || typeof raw !== "object") {
      return null
    }

    const reconciliation_id =
      raw.reconciliation_id ??
      raw.eventId ??
      raw.id ??
      (raw._id != null ? String(raw._id) : null)

    if (
      typeof reconciliation_id !== "string" ||
      reconciliation_id.trim() === ""
    ) {
      return null
    }

    const sensor_id =
      raw.sensor_id ??
      raw.sensorId ??
      "—"

    const rawTs =
      raw.timestamp ??
      raw.createdAt ??
      raw.created_at ??
      raw.updatedAt

    const tsDate = rawTs ? new Date(rawTs) : new Date()
    const timestamp = !isNaN(tsDate.getTime())
      ? tsDate.toISOString()
      : new Date().toISOString()
    const _ts = !isNaN(tsDate.getTime()) ? tsDate.getTime() : Date.now()

    const mlResult =
      raw.mlResult && typeof raw.mlResult === "object"
        ? raw.mlResult
        : {}

    const ml_label =
      normalizeLabel(raw.decision) ??
      normalizeLabel(raw.status) ??
      normalizeLabel(raw.ml_label) ??
      normalizeLabel(mlResult.status) ??
      normalizeLabel(raw.action) ??
      "consistent"

    let ml_confidence = normalizeNumber(
      mlResult.confidence ??
      raw.ml_confidence ??
      raw.confidence,
    )

    if (ml_confidence !== null) {
      if (ml_confidence > 1 && ml_confidence <= 100) {
        ml_confidence = ml_confidence / 100
      }
      ml_confidence = Math.min(1, Math.max(0, ml_confidence))
    }

    const source_values = normalizeSourceValues(
      raw.source_values ?? raw.sourceValues,
    )

    const trusted_value = normalizeNumber(
      raw.trusted_value ??
      raw.trustedValue,
    )

    const requires_human_review = Boolean(
      raw.requires_human_review ??
      raw.requiresHumanReview ??
      (raw.decision === "HUMAN_REVIEW_REQUIRED" || raw.status === "HUMAN_REVIEW_REQUIRED"),
    )

    const alert =
      typeof raw.alert === "boolean"
        ? raw.alert
        : requires_human_review ||
          raw.decision === "CONFLICT_DETECTED" ||
          raw.status === "CONFLICT_DETECTED" ||
          ml_label === "conflicting"

    const explanation =
      typeof raw.explanation === "string"
        ? raw.explanation
        : typeof raw.reason === "string"
          ? raw.reason
          : ""

    const conflicting_sources = Array.isArray(raw.conflicting_sources)
      ? raw.conflicting_sources
      : Array.isArray(raw.conflictingSources)
        ? raw.conflictingSources
        : Array.isArray(mlResult.conflictingSources)
          ? mlResult.conflictingSources
          : []

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
      conflicting_sources,
      requires_human_review,
      _ts,
    }
  } catch {
    return null
  }
}

/**
 * Format numeric reading.
 */
export function fmtValue(value, digits = 1) {
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

  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence)
  return `${pct}%`
}