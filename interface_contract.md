# SignalSynch AI — Interface Contract
> **Source of truth for all team boundaries** | Backend ↔ ML ↔ Frontend ↔ Simulator
> Any deviation from this document must be approved by CTO before implementation.

---

## Boundary Map

```
┌──────────────┐   ① HTTP POST /ingest    ┌─────────────────────────────────────────────┐
│  SIMULATOR   │ ───────────────────────► │                  BACKEND                    │
│  (Python)    │                          │                                             │
└──────────────┘                          │  ② Internal function call                   │
                                          │  reconciler.py ──► ml_service.predict()     │
                                          │                                             │
                                          │  ③ HTTP GET /stream (SSE)                  │
                                          │  HTTP GET /events/latest                   │
                                          │  HTTP GET /audit                           │
                                          └────────────────┬────────────────────────────┘
                                                           │ ③
                                                           ▼
                                                    ┌─────────────┐
                                                    │  FRONTEND   │
                                                    │   (React)   │
                                                    └─────────────┘
```

**Three boundaries:**
- **Boundary ①** — Simulator → Backend (HTTP POST)
- **Boundary ②** — Backend ↔ ML (internal Python function call, NOT HTTP)
- **Boundary ③** — Backend → Frontend (SSE stream + REST endpoints)

---

## Boundary ① — Simulator → Backend

### `POST /ingest`

The simulator sends one event per source per tick. At 10Hz with 3 sources and 5 sensors, the backend receives up to 30 req/s.

**Request**
```
POST http://localhost:8000/ingest
Content-Type: application/json
```

```json
{
  "source_id": "A",
  "sensor_id": "sensor_001",
  "timestamp": "2026-08-23T08:09:00.123Z",
  "value": 42.7,
  "unit": "celsius"
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `source_id` | `string` | enum: `"A"`, `"B"`, `"C"` | Which simulated source sent this |
| `sensor_id` | `string` | enum: `"sensor_001"` … `"sensor_005"` | Which sensor the reading is from |
| `timestamp` | `string` | ISO 8601 UTC | Time of reading. Simulator sets this |
| `value` | `float` | any | The sensor reading |
| `unit` | `string` | `"celsius"` (fixed for MVP) | Unit of measurement |

**Response — 200 OK**
```json
{
  "status": "received",
  "sensor_id": "sensor_001"
}
```

**Response — 422 Unprocessable Entity** (bad payload)
```json
{
  "detail": "validation error message"
}
```

> [!IMPORTANT]
> Backend must respond within **100ms** per ingest call (NFR: 10Hz processing rate).
> Simulator does NOT wait for reconciliation — it just fires and forgets.
> Reconciliation happens async in-memory after all 3 sources have posted for a sensor within a 200ms window.

---

## Boundary ② — Backend ↔ ML (Internal Python Call)

> [!IMPORTANT]
> ML is **NOT a separate service**. It is a Python module (`ml_service.py`) imported directly into the backend.
> There is no HTTP call here. This keeps inference latency well under the 200ms NFR.

### Function Signature

**Input — called by `reconciler.py`**
```python
from ml_service import predict

result = predict(val_A=42.7, val_B=43.1, val_C=41.9)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `val_A` | `float` | Reading from Source A for this sensor tick |
| `val_B` | `float` | Reading from Source B for this sensor tick |
| `val_C` | `float` | Reading from Source C for this sensor tick |

**Output — returned to `reconciler.py`**
```python
{
  "label": "consistent",       # str: "consistent" | "conflicting"
  "confidence": 0.87,          # float: 0.0 – 1.0, model's confidence in label
  "features": {
    "mean": 42.57,             # float: mean of [A, B, C]
    "std_dev": 0.51,           # float: std deviation of [A, B, C]
    "max_deviation": 0.53,     # float: max abs deviation from mean
    "range": 1.2               # float: max - min of [A, B, C]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | `"consistent"` or `"conflicting"` |
| `confidence` | `float` | Probability score from RandomForest |
| `features` | `dict` | Computed features used for inference (drives explainability) |

> [!NOTE]
> If any source value is missing (Source C hasn't posted yet for this tick), the caller passes `None`.
> `predict()` must handle missing values — substitute missing value with mean of available values.
> ML must load `model.pkl` **once at module import**, not on every call.
> Target: **< 10ms** per call (NFR requires < 200ms — sklearn RF is well within this).

---

## Boundary ③ — Backend → Frontend

### A. `GET /stream` — Server-Sent Events (Primary real-time channel)

**Request**
```
GET http://localhost:8000/stream
Accept: text/event-stream
```

**Response** — chunked, persistent connection
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE Event format** (emitted after each reconciliation, ~every 200ms per sensor):
```
event: reconciliation
data: <JSON payload below>

```
*(blank line terminates each event)*

**SSE Data Payload**
```json
{
  "reconciliation_id": "a3f7b2c1-...",
  "sensor_id": "sensor_001",
  "timestamp": "2026-08-23T08:09:00.123Z",
  "source_values": {
    "A": 42.7,
    "B": 43.1,
    "C": 51.2
  },
  "trusted_value": 42.9,
  "ml_label": "conflicting",
  "ml_confidence": 0.91,
  "alert": true,
  "explanation": "Source C flagged as outlier (+4.2σ). Trusted: median(A, B)."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `reconciliation_id` | `string` | UUID — links SSE event to audit log row |
| `sensor_id` | `string` | Which sensor this reconciliation is for |
| `timestamp` | `string` | ISO 8601 UTC of the reading group |
| `source_values` | `object` | Raw values from each source (`A`, `B`, `C`) |
| `trusted_value` | `float` | Reconciled output — single source of truth |
| `ml_label` | `string` | `"consistent"` or `"conflicting"` |
| `ml_confidence` | `float` | 0.0–1.0 |
| `alert` | `boolean` | `true` when conflict detected, operator action needed |
| `explanation` | `string` | Human-readable reason for reconciliation decision |

> [!NOTE]
> `source_values` may have `null` for a source if it didn't post in the window.
> Frontend must handle null gracefully (show "—" in chart gap, don't crash).

---

### B. `GET /events/latest` — Polling Fallback

Used if SSE fails to connect. Frontend polls this every 2 seconds.

**Request**
```
GET http://localhost:8000/events/latest?limit=20
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | `int` | `20` | Max records to return |

**Response — 200 OK**
```json
{
  "events": [
    {
      "reconciliation_id": "a3f7b2c1-...",
      "sensor_id": "sensor_001",
      "timestamp": "2026-08-23T08:09:00.123Z",
      "source_values": { "A": 42.7, "B": 43.1, "C": 51.2 },
      "trusted_value": 42.9,
      "ml_label": "conflicting",
      "ml_confidence": 0.91,
      "alert": true,
      "explanation": "Source C flagged as outlier (+4.2σ). Trusted: median(A, B)."
    }
  ],
  "count": 20
}
```

---

### C. `GET /audit` — Audit Log

**Request**
```
GET http://localhost:8000/audit?page=1&limit=50
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `int` | `1` | Page number |
| `limit` | `int` | `50` | Rows per page (max 100) |

**Response — 200 OK**
```json
{
  "total": 1240,
  "page": 1,
  "limit": 50,
  "records": [
    {
      "reconciliation_id": "a3f7b2c1-...",
      "sensor_id": "sensor_001",
      "timestamp": "2026-08-23T08:09:00.123Z",
      "source_values": "{\"A\": 42.7, \"B\": 43.1, \"C\": 51.2}",
      "trusted_value": 42.9,
      "ml_label": "conflicting",
      "ml_confidence": 0.91,
      "alert": true,
      "explanation": "Source C flagged as outlier (+4.2σ). Trusted: median(A, B)."
    }
  ]
}
```

> [!NOTE]
> `source_values` is stored as a JSON string in SQLite, returned as-is. Frontend must `JSON.parse()` it.
> Records are ordered by `timestamp DESC` (newest first).

---

### D. `GET /health` — Health Check

**Request**
```
GET http://localhost:8000/health
```

**Response — 200 OK**
```json
{
  "status": "ok",
  "model_loaded": true,
  "uptime_seconds": 142
}
```

Frontend pings this on load to confirm backend is up before starting SSE.

---

## CORS Policy (Backend must configure)

```python
# Backend must allow all origins during development
allow_origins=["*"]
allow_methods=["GET", "POST"]
allow_headers=["*"]
```

---

## Timing Constraints (from NFRs)

| Boundary | NFR Requirement | Target |
|----------|----------------|--------|
| POST /ingest response | < 100ms (to sustain 10Hz) | < 50ms |
| ML inference (Boundary ②) | < 200ms | < 10ms |
| SSE event emission after ingest | < 500ms end-to-end | ~200ms |
| Frontend chart refresh | every 2 seconds | 2s |
| POST /ingest throughput | 10 concurrent streams | 30 req/s max in MVP |

---

## What the Frontend Must NOT Assume

- ❌ Do not assume all 3 sources always have a value — handle `null` in `source_values`
- ❌ Do not assume SSE is always available — implement polling fallback
- ❌ Do not call `/ingest` directly — that's the simulator's job only
- ❌ Do not parse `explanation` as structured data — it's a display string only
- ❌ Do not implement auth headers — none required

## What the ML Module Must NOT Do

- ❌ Do not start an HTTP server — it's an imported Python module only
- ❌ Do not re-load `model.pkl` on every call — load once at import
- ❌ Do not return raw sklearn objects to caller — only the dict format above
- ❌ Do not crash on None inputs — handle gracefully

## What the Backend Must NOT Do

- ❌ Do not persist raw events to DB — only final reconciliation decisions go to SQLite
- ❌ Do not block on ML inference — it's synchronous but fast; no async wrapper needed
- ❌ Do not expose internal state endpoints beyond what's listed above

---

*Contract locked at 08:28 IST — any changes require CTO approval.*
