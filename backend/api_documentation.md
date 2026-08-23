# SignalSynch API Documentation

This document outlines all REST endpoints and WebSockets (Socket.IO) events available in the SignalSynch MVP backend. It is designed for Frontend developers to easily integrate the React dashboard.

## Base URL
All API requests should be prefixed with:
`http://localhost:5000/api`

> [!NOTE] 
> Standard responses all follow this envelope format:
> `{ "success": boolean, "message": string, "data": any }`

---

## 1. Events

### `POST /events`
Ingest raw events from the simulator. Supports single events or arrays. Normalizes three different formats automatically.

**Request Body (Format A):**
```json
{
  "eventId": "EVT-001",
  "source": "SOURCE_A",
  "value": 72.4,
  "timestamp": "2026-08-23T10:30:00Z"
}
```
*(Also supports Format B (`event_id`, `source_id`, `reading`, `time`) and Format C (`id`, `source`, `eventValue`, `timestamp`).)*

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Event processed successfully",
  "data": [
    {
      "eventId": "EVT-001",
      "source": "SOURCE_A",
      "value": 72.4,
      "timestamp": "2026-08-23T10:30:00.000Z",
      "_id": "64f1b2c3..."
    }
  ]
}
```

### `GET /events`
Fetch all raw events, sorted by newest first. Supports pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `eventId` (optional filter)
- `source` (optional filter)

**Response:**
```json
{
  "success": true,
  "message": "Events fetched successfully",
  "data": {
    "events": [
      {
        "eventId": "EVT-001",
        "source": "SOURCE_A",
        "value": 72.4,
        "timestamp": "2026-08-23T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

### `GET /events/:eventId`
Fetch all raw events (from sources A, B, C) grouped under a specific Event ID.

**Response:**
```json
{
  "success": true,
  "message": "Events fetched successfully",
  "data": [
    { "source": "SOURCE_A", "value": 72.4, ... },
    { "source": "SOURCE_B", "value": 72.5, ... }
  ]
}
```

---

## 2. Reconciliation

### `GET /reconciliation`
Fetch all reconciliation records (the final trusted values for each event group).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `status` (optional filter: `CONSISTENT`, `AUTO_RESOLVED`, `CONFLICT_DETECTED`, `HUMAN_REVIEW_REQUIRED`)

**Response:**
```json
{
  "success": true,
  "message": "Reconciliations fetched successfully",
  "data": {
    "records": [
      {
        "eventId": "EVT-001",
        "sourceValues": [
          { "source": "SOURCE_A", "value": 72.4 },
          { "source": "SOURCE_B", "value": 72.5 },
          { "source": "SOURCE_C", "value": 91.8 }
        ],
        "trustedValue": 72.45,
        "status": "AUTO_RESOLVED",
        "confidence": 0.85,
        "conflictingSources": ["SOURCE_C"],
        "reason": "Automatic consensus reached. Source SOURCE_C was ignored.",
        "requiresHumanReview": false
      }
    ],
    "total": 12,
    "page": 1,
    "pages": 1
  }
}
```

### `GET /reconciliation/:eventId`
Fetch the reconciliation status for a specific Event ID.

---

## 3. Alerts

### `GET /alerts`
Fetch active and past alerts. Alerts are created automatically when the ML model detects conflicts that cannot be auto-resolved.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `status` (optional filter: `OPEN`, `RESOLVED`)

**Response:**
```json
{
  "success": true,
  "message": "Alerts fetched successfully",
  "data": {
    "alerts": [
      {
        "_id": "64f1c...",
        "eventId": "EVT-002",
        "type": "HUMAN_REVIEW_REQUIRED",
        "message": "High anomaly detected. Manual intervention required.",
        "severity": "HIGH",
        "status": "OPEN",
        "createdAt": "2026-08-23T10:35:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

### `POST /alerts/:id/resolve`
Manually resolve an alert.

**Request Body:**
```json
{
  "resolutionNote": "Checked sensor C physically, it is malfunctioning."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "data": {
    "status": "RESOLVED",
    "resolutionNote": "Checked sensor C physically..."
  }
}
```

---

## 4. Audit Logs

### `GET /audit-logs`
Fetch the immutable audit trail of all reconciliation decisions and manual overrides.

**Query Parameters:**
- `page`, `limit`, `eventId`

**Response:**
```json
{
  "success": true,
  "message": "Audit logs fetched successfully",
  "data": {
    "logs": [
      {
        "eventId": "EVT-001",
        "action": "AUTO_RECONCILIATION",
        "decision": "AUTO_RESOLVED",
        "trustedValue": 72.45,
        "reason": "Automatic consensus reached.",
        "createdAt": "2026-08-23T10:30:00.000Z"
      }
    ]
  }
}
```

---

## 5. WebSockets (Socket.IO)

The backend provides a real-time event stream over Socket.IO to power live dashboard charts without polling.

**Connection URL:** `http://localhost:5000`

### Available Events (Listen for these on the frontend)

1. **`new-event`**
   - Fired when a raw event from any source is ingested.
   - **Payload:** `{ eventId, source, value, timestamp }`

2. **`ml-result`**
   - Fired when the ML model finishes scoring an event group.
   - **Payload:** `{ eventId, mlResult: { status, confidence, anomalyScore, conflictingSources } }`

3. **`reconciliation-result`**
   - Fired when a final trusted value is saved to the database.
   - **Payload:** `{ eventId, trustedValue, status, reason, requiresHumanReview }`

4. **`conflict-alert`**
   - Fired when an alert is created (e.g. `HUMAN_REVIEW_REQUIRED`).
   - **Payload:** `{ alertId, eventId, type, message, severity }`

5. **`alert-resolved`**
   - Fired when an operator resolves an alert.
   - **Payload:** `{ alertId, eventId, resolutionNote }`

### Example React Socket.IO Implementation
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

socket.on('new-event', (data) => {
  console.log(`Live reading: ${data.source} sent ${data.value}`);
});

socket.on('reconciliation-result', (data) => {
  console.log(`Trusted value for ${data.eventId} is ${data.trustedValue}`);
});
```
