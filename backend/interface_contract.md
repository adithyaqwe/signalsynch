# SignalSynch AI — Interface Contract
> **Updated Source of Truth** | Backend ↔ ML ↔ Frontend ↔ Simulator

---

## Boundary Map

```
┌──────────────┐   ① HTTP POST /api/events┌─────────────────────────────────────────────┐
│  SIMULATOR   │ ───────────────────────► │                  BACKEND                    │
│              │                          │               (Node.js/Express)             │
└──────────────┘                          │                                             │
                                          │  ② Internal Mock OR External HTTP POST      │
                                          │  mlService.js ──► Mock Logic / ML_SERVICE_URL
                                          │                                             │
                                          │  ③ WebSocket (Socket.IO)                   │
                                          │  HTTP GET /api/events                       │
                                          │  HTTP GET /api/reconciliation               │
                                          │  HTTP GET /api/alerts                       │
                                          │  HTTP GET /api/audit-logs                   │
                                          └────────────────┬────────────────────────────┘
                                                           │ ③
                                                           ▼
                                                    ┌─────────────┐
                                                    │  FRONTEND   │
                                                    │   (React)   │
                                                    └─────────────┘
```

---

## Boundary ① — Simulator → Backend

### `POST /api/events`

The simulator can send single events or arrays of events. The backend normalizes three distinct formats automatically.

**Format A**
```json
{
  "eventId": "EVT-001",
  "source": "SOURCE_A",
  "value": 72.4,
  "timestamp": "2026-08-23T10:30:00Z"
}
```

**Format B**
```json
{
  "event_id": "EVT-001",
  "source_id": "SOURCE_B",
  "reading": 72.5,
  "time": "2026-08-23T10:30:01Z"
}
```

**Format C**
```json
{
  "id": "EVT-001",
  "source": "SOURCE_C",
  "eventValue": 91.8,
  "timestamp": "2026-08-23T10:30:02Z"
}
```

**Response — 201 Created**
```json
{
  "success": true,
  "message": "Event processed successfully",
  "data": [ ...saved normalized events... ]
}
```

---

## Boundary ② — Backend ↔ ML

By default, the MVP uses a Mock ML function inside `mlService.js`. 
If `USE_MOCK_ML=false` is set in `.env`, the backend will proxy the event group to an external Python service via Axios POST to `process.env.ML_SERVICE_URL`.

**ML Response Contract (from Mock or External)**
```json
{
  "status": "consistent" | "conflicting",
  "confidence": 0.94,
  "anomalyScore": 0.04,
  "reason": "Human readable explanation",
  "conflictingSources": ["SOURCE_C"] // Only present if status is conflicting
}
```

---

## Boundary ③ — Backend → Frontend

### A. Real-Time WebSockets (Socket.IO)

The backend exposes a Socket.IO server on the main port. Clients can connect without authentication.

**Emitted Events:**
- `new-event`: Fired when a new raw event is successfully saved.
- `ml-result`: Fired when an ML analysis finishes. Payload: `{ eventId, mlResult }`.
- `reconciliation-result`: Fired when a reconciliation decision is made and saved.
- `conflict-alert`: Fired when an alert is generated (e.g., HUMAN_REVIEW_REQUIRED).
- `alert-resolved`: Fired when an operator resolves an alert.

### B. REST API Endpoints

All endpoints return a standardized JSON format:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Available Endpoints:**
- `GET /api/events`: Fetch all events (supports `?page`, `limit`, `eventId`, `source`).
- `GET /api/events/:eventId`: Fetch all events for a specific group.
- `GET /api/reconciliation`: Fetch all reconciliation records.
- `GET /api/reconciliation/:eventId`: Fetch specific reconciliation record.
- `POST /api/reconciliation/reconcile/:eventId`: Manually trigger reconciliation for a group.
- `GET /api/alerts`: Fetch open alerts.
- `POST /api/alerts/:id/resolve`: Resolve a specific alert.
- `GET /api/audit-logs`: Fetch audit logs.

---

*Contract updated to reflect Node.js/Express implementation.*
