/**
 * Mock data mode — development fallback ONLY.
 *
 * Generates realistic events that match the EXACT backend contract so the UI
 * renders mock and real payloads identically. Enabled via VITE_USE_MOCK_DATA
 * or automatically when the backend is unreachable (dev convenience).
 *
 * This must never be wired into the real API path — it is a standalone source.
 */

import { KNOWN_SENSORS, SOURCE_KEYS } from "../lib/validation.js"

// Baseline "true" reading per sensor, drifts slowly over time.
const baselines = Object.fromEntries(
  KNOWN_SENSORS.map((s, i) => [s, 40 + i * 3.5]),
)

let seq = 0

function uuid() {
  // Simple RFC4122-ish id; good enough for mock identity.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function jitter(mag) {
  return (Math.random() - 0.5) * 2 * mag
}

function median(nums) {
  const arr = nums.filter((n) => n !== null).sort((a, b) => a - b)
  if (arr.length === 0) return null
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
}

/**
 * Generate one reconciliation event for a sensor.
 * @param {object} opts
 * @param {string} opts.sensorId
 * @param {"auto"|"consistent"|"conflict"} [opts.mode]
 * @param {boolean} [opts.allowNull]
 */
export function generateMockEvent({ sensorId, mode = "auto", allowNull = true } = {}) {
  seq += 1
  const sid = sensorId || KNOWN_SENSORS[seq % KNOWN_SENSORS.length]

  // Slow baseline drift so charts look alive.
  baselines[sid] += jitter(0.08)
  const base = baselines[sid]

  // Decide conflict state.
  let conflict
  if (mode === "consistent") conflict = false
  else if (mode === "conflict") conflict = true
  else conflict = Math.random() < 0.22 // ~1 in 5 auto events conflict

  const values = {
    A: base + jitter(0.6),
    B: base + jitter(0.6),
    C: base + jitter(0.6),
  }

  let explanation
  let label
  let alert
  let trusted

  if (conflict) {
    // Push one source into outlier territory.
    const outlier = SOURCE_KEYS[Math.floor(Math.random() * SOURCE_KEYS.length)]
    const sigma = (Math.random() * 3 + 3).toFixed(1)
    const sign = Math.random() < 0.5 ? -1 : 1
    values[outlier] = base + sign * (6 + Math.random() * 4)
    const kept = SOURCE_KEYS.filter((k) => k !== outlier)
    trusted = median(kept.map((k) => values[k]))
    label = "conflicting"
    alert = true
    explanation = `Source ${outlier} flagged as outlier (${sign > 0 ? "+" : "-"}${sigma}σ). Trusted: median(${kept.join(", ")}).`
  } else {
    label = "consistent"
    alert = false
    // Occasionally drop a source to null to exercise the "—"/gap path.
    if (allowNull && Math.random() < 0.08) {
      const drop = SOURCE_KEYS[Math.floor(Math.random() * SOURCE_KEYS.length)]
      values[drop] = null
    }
    trusted = median(SOURCE_KEYS.map((k) => values[k]))
    explanation = `All sources within tolerance. Trusted: median(${SOURCE_KEYS.filter((k) => values[k] !== null).join(", ")}).`
  }

  const confidence = conflict
    ? 0.82 + Math.random() * 0.15
    : 0.9 + Math.random() * 0.09

  // Round to 1 decimal like a real sensor feed.
  const source_values = {}
  for (const k of SOURCE_KEYS) {
    source_values[k] = values[k] === null ? null : round1(values[k])
  }

  return {
    reconciliation_id: uuid(),
    sensor_id: sid,
    timestamp: new Date().toISOString(),
    source_values,
    trusted_value: trusted === null ? null : round1(trusted),
    ml_label: label,
    ml_confidence: Number(confidence.toFixed(2)),
    alert,
    explanation,
  }
}

function round1(n) {
  return Math.round(n * 10) / 10
}

/** Build a seeded batch (newest last), used to warm up charts/history. */
export function generateMockBatch(count = 12, sensorId) {
  const out = []
  for (let i = 0; i < count; i++) {
    out.push(generateMockEvent({ sensorId, mode: "consistent" }))
  }
  return out
}

/** Build a mock audit page matching the /audit response shape. */
export function generateMockAuditPage(page = 1, limit = 50, total = 214) {
  const records = []
  const start = (page - 1) * limit
  for (let i = 0; i < limit && start + i < total; i++) {
    const ev = generateMockEvent({ mode: "auto" })
    // audit encodes source_values as a JSON STRING per contract.
    records.push({
      ...ev,
      source_values: JSON.stringify(ev.source_values),
      // stagger timestamps so ordering looks realistic (newest first)
      timestamp: new Date(Date.now() - (start + i) * 4000).toISOString(),
    })
  }
  return { total, page, limit, records }
}
