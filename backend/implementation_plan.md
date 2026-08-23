# SignalSynch MVP — Implementation Plan

> **Updated Architecture** | Node.js / Express / MongoDB MVP

---

## Problem Summary

A real-time event data reconciliation system that ingests simulated event feeds from multiple sources. It normalizes differing data formats, scores conflicts via a Mock ML service, and intelligently resolves values. It provides alerts for human review and streams updates in real-time via Socket.IO.

---

## Architecture Decision (Simplest Viable)

```
┌─────────────────────────────────────────────────────────────┐
│                     SIMULATOR (Any client)                  │
│  Source A ──┐                                               │
│  Source B ──┼──► HTTP POST /api/events                      │
│  Source C ──┘                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  BACKEND (Node.js / Express)                 │
│                                                             │
│  POST /api/events                                           │
│      │                                                      │
│  [Normalizer] ──► unify formats A, B, C                    │
│      │                                                      │
│  [Reconciliation Engine] ──► group by eventId              │
│      │                                                      │
│  [Mock ML Service] ──► statistical conflict detection       │
│      │                                                      │
│  [Decision Logic] ──► trusted_value or HUMAN_REVIEW         │
│      │                                                      │
│  [MongoDB] ──► save Event, Reconciliation, Alert, AuditLog  │
│      │                                                      │
│  [Socket.IO] ──► emit real-time events                      │
└─────────────────────────────────────────────────────────────┘
                      │  WebSocket / REST
┌─────────────────────▼───────────────────────────────────────┐
│                  FRONTEND (React)                           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | **Node.js + Express.js** | Fast, asynchronous, excellent for I/O and real-time. |
| Database | **MongoDB (Mongoose)** | Flexible schema for event metadata, easy to query. |
| Real-time | **Socket.IO** | Simple WebSocket abstraction with fallback polling. |
| ML Integration | **Internal Mock + Axios** | Mock logic ensures MVP works instantly; Axios handles future external Python ML endpoints. |

---

## Data Models (MongoDB)

### Event Model
- `eventId`: String (Indexed)
- `source`: String
- `value`: Number
- `timestamp`: Date
- `metadata`: Object

### Reconciliation Model
- `eventId`: String (Unique)
- `sourceValues`: Array of `{ source, value }`
- `trustedValue`: Number
- `status`: Enum (`CONSISTENT`, `AUTO_RESOLVED`, `CONFLICT_DETECTED`, `HUMAN_REVIEW_REQUIRED`)
- `confidence`: Number
- `conflictingSources`: Array of Strings
- `mlResult`: Object
- `reason`: String
- `requiresHumanReview`: Boolean

### Alert Model
- `eventId`: String
- `type`: String
- `message`: String
- `status`: Enum (`OPEN`, `RESOLVED`)
- `severity`: String (`HIGH`, etc.)

### AuditLog Model
- `eventId`: String
- `action`: String
- `decision`: String
- `trustedValue`: Number
- `reason`: String
- `mlResult`: Object

---

## Reconciliation Engine Logic

When an event group has 2 or more readings:
1. **Mock ML**: Extracts values, calculates median and deviations. If a value deviates significantly, it's flagged as an outlier (conflict).
2. **Consensus**:
   - If ML says `consistent`: Trusted value = median.
   - If ML says `conflicting` but 2 sources agree: Trusted value = median of the 2 agreeing sources. Auto-resolved.
   - If ML confidence is low or no consensus exists: Flagged as `HUMAN_REVIEW_REQUIRED`.
3. **Alerts**: Created automatically if human review is needed.
4. **Audit Log**: Every decision is permanently recorded.

---

## What Will NOT Be Built in this MVP
- ❌ TypeScript, Next.js, NestJS
- ❌ Firebase, Supabase, Redis, Kafka
- ❌ Authentication / user login
- ❌ Kubernetes or complex containerization

---

*Plan updated to reflect Node.js/Express implementation.*
