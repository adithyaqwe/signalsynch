# SignalSynch AI — Implementation Plan
> **CTO/Lead Architect** | 6-Hour Hackathon MVP | Start: 08:09 IST

---

## Problem Summary

A reconciliation console that ingests two (extended to three per PRD) simulated event feeds, scores conflicts via an AI/ML model, and lets operators monitor resolutions in real-time via a frontend dashboard.

---

## Architecture Decision (Simplest Viable)

```
┌─────────────────────────────────────────────────────────────┐
│                     SIMULATOR (Python)                      │
│  Source A ──┐                                               │
│  Source B ──┼──► HTTP POST /ingest  (10 Hz, 3 streams)     │
│  Source C ──┘                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  BACKEND (FastAPI / Python)                  │
│                                                             │
│  POST /ingest                                               │
│      │                                                      │
│  [Normalizer] ──► group by sensor_id + time window         │
│      │                                                      │
│  [ML Model] ──► sklearn RandomForest → consistent/conflict  │
│      │                                                      │
│  [Reconciliation Engine] ──► trusted_value + explanation   │
│      │                                                      │
│  [SQLite Audit Log] ──► append every decision              │
│      │                                                      │
│  GET /stream  (SSE) ──────────────────────────────────────► │
│  GET /history                                               │
│  GET /audit                                                 │
└─────────────────────────────────────────────────────────────┘
                      │  SSE / REST (2s poll)
┌─────────────────────▼───────────────────────────────────────┐
│                  FRONTEND (React + Recharts)                 │
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │  3 Live Streams  │  │ Reconciled Value │  │  Alerts   │  │
│  │  (line charts)  │  │ + ML Confidence  │  │  Panel    │  │
│  └─────────────────┘  └──────────────────┘  └───────────┘  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Audit Log Table (scrollable)           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Technology Choices (no overengineering)

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | **FastAPI** (Python) | Async, fast, built-in SSE, easy ML integration |
| ML | **scikit-learn RandomForest** | Fast to train (<2 min), <50ms inference, no GPU needed |
| Simulator | **Python script** (threading) | Dead simple, runs alongside backend |
| Real-time | **Server-Sent Events (SSE)** | Simpler than WebSockets, no extra libraries |
| Frontend | **React + Recharts + Tailwind** | Fast to build charts and dashboard |
| Audit DB | **SQLite (via Python sqlite3)** | Zero-config, persistent, queryable |
| State | **In-memory dict** in FastAPI | No Redis needed for 6-hour MVP |

> [!IMPORTANT]
> **NOT building**: Docker, Kubernetes, message brokers (Kafka/RabbitMQ), PostgreSQL, authentication, cloud infra, WebSockets. These are unnecessary for a 6-hour demo.

---

## Data Model

### Incoming Event (POST /ingest)
```json
{
  "source_id": "A" | "B" | "C",
  "sensor_id": "sensor_001",
  "timestamp": "2026-08-23T08:09:00Z",
  "value": 42.7,
  "unit": "celsius"
}
```

### Reconciliation Result (SSE / GET /stream)
```json
{
  "sensor_id": "sensor_001",
  "timestamp": "2026-08-23T08:09:00Z",
  "source_values": { "A": 42.7, "B": 43.1, "C": 41.9 },
  "trusted_value": 42.57,
  "ml_label": "consistent" | "conflicting",
  "ml_confidence": 0.87,
  "alert": false,
  "explanation": "Median selected; all sources within 1.2°C threshold",
  "reconciliation_id": "uuid"
}
```

### Audit Log (SQLite)
```
reconciliation_id | sensor_id | timestamp | source_values | trusted_value | ml_label | alert | explanation
```

---

## ML Model Design

- **Features**: `[val_A, val_B, val_C, mean, std_dev, max_deviation, range]`
- **Label**: `0 = consistent`, `1 = conflicting`
- **Algorithm**: RandomForestClassifier (n_estimators=50, max_depth=5)
- **Training data**: 2000 synthetic samples (1500 normal, 500 conflicting with injected outliers)
- **Conflict definition**: any source deviates >2σ from mean of the three sources
- **Target**: <200ms inference ✅ (sklearn RF is typically <10ms)
- **Training time**: <2 minutes ✅
- **Model persistence**: saved as `model.pkl` loaded once at backend startup

---

## Reconciliation Engine Logic

```
IF ml_label == "consistent":
    trusted_value = median(A, B, C)
    alert = False
    explanation = "Consensus: median of {A, B, C}"

IF ml_label == "conflicting":
    outlier = source with max deviation from median
    trusted_value = median of remaining two sources
    alert = True
    explanation = "Source {X} flagged as outlier (+{dev}σ). Trusted: median({Y}, {Z})"
```

> [!NOTE]
> This keeps reconciliation logic deterministic and explainable — satisfying both P0 and the P2 explainability bonus with minimal extra work.

---

## Simulated Data Streams

Three Python threads, each posting at ~10Hz (100ms interval):

- **Source A**: Baseline signal + small Gaussian noise (σ=0.5)
- **Source B**: Baseline signal + small Gaussian noise (σ=0.5)  
- **Source C**: Normally clean; **20% of the time** injects a conflict (±5–10 unit spike)

Sensors: `sensor_001` through `sensor_005` (5 sensors cycling)

This guarantees conflicts happen regularly enough to demo without being constant.

---

## 6-Hour Timeline

```
08:09  ─── PRD received, architecture locked
08:30  ─── [BACKEND] Project scaffold + POST /ingest endpoint
09:00  ─── [ML] Synthetic data generation + model training
09:30  ─── [BACKEND] Normalizer + reconciliation engine + SSE endpoint
10:00  ─── [ML] Model integrated into backend, inference working
10:30  ─── [FRONTEND] Dashboard scaffold + live stream charts
11:30  ─── [FRONTEND] Alerts panel + audit log table
12:00  ─── [ALL] Integration test: simulator → backend → frontend
12:30  ─── [ALL] Bug fixes, edge cases, polish
13:00  ─── [ALL] Demo dry run
14:09  ─── 🎯 DEMO DEADLINE
```

---

## Component Tasks

### Backend Agent Tasks
- [ ] FastAPI app scaffold (`main.py`, `models.py`, `reconciler.py`, `normalizer.py`)
- [ ] `POST /ingest` — receive event, normalize, group by sensor+window
- [ ] `GET /stream` — SSE endpoint pushing reconciliation results every 200ms
- [ ] `GET /history?sensor_id=X` — last 50 reconciliation results
- [ ] `GET /audit` — paginated audit log from SQLite
- [ ] SQLite audit logging (auto-create table on startup)
- [ ] In-memory state: rolling window of last 30s per sensor
- [ ] Load `model.pkl` at startup, expose inference method
- [ ] CORS enabled for React dev server

### AI/ML Agent Tasks
- [ ] `generate_training_data.py` — 2000 synthetic samples with labels
- [ ] `train_model.py` — train RandomForest, evaluate, save `model.pkl`
- [ ] `ml_service.py` — `predict(val_A, val_B, val_C)` → `{label, confidence, features}`
- [ ] Achieve >90% accuracy on synthetic test set
- [ ] Validate inference time <200ms (should be <10ms with sklearn)
- [ ] Document feature engineering decisions

### Frontend Agent Tasks
- [ ] React app scaffold (Vite + Tailwind + Recharts)
- [ ] SSE hook — consume `/stream` endpoint, update state
- [ ] **Live Stream Panel**: 3 line charts (one per source), last 30 data points, color-coded
- [ ] **Reconciliation Panel**: current trusted value, ML label badge, confidence bar
- [ ] **Alert Banner**: red flash when `alert=true`, sensor name + explanation
- [ ] **Audit Log Table**: scrollable, last 100 entries, timestamp/sensor/decision/alert columns
- [ ] Auto-refresh every 2 seconds (SSE handles this)
- [ ] Conflict rows highlighted in red in audit table

---

## File Structure

```
signalsynch/
├── backend/
│   ├── main.py              # FastAPI app + routes
│   ├── models.py            # Pydantic data models
│   ├── normalizer.py        # Event normalization + grouping
│   ├── reconciler.py        # Reconciliation engine logic
│   ├── ml_service.py        # Load model, run inference
│   ├── audit.py             # SQLite audit log
│   ├── simulator.py         # 3-stream data simulator
│   ├── model.pkl            # Trained sklearn model
│   └── requirements.txt
├── ml/
│   ├── generate_data.py     # Synthetic training data
│   ├── train_model.py       # Model training script
│   └── evaluate_model.py   # Quick accuracy report
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── StreamPanel.jsx
    │   │   ├── ReconciliationPanel.jsx
    │   │   ├── AlertBanner.jsx
    │   │   └── AuditLog.jsx
    │   └── hooks/
    │       └── useSSE.js
    ├── package.json
    └── vite.config.js
```

---

## API Contract (Backend ↔ Frontend)

### SSE Stream Event Format
```
event: reconciliation
data: {"sensor_id":"sensor_001","trusted_value":42.57,"ml_label":"conflicting","ml_confidence":0.91,"alert":true,"source_values":{"A":42.7,"B":43.1,"C":51.2},"explanation":"Source C flagged as outlier (+4.2σ). Trusted: median(A, B)","timestamp":"2026-08-23T08:09:00Z","reconciliation_id":"abc-123"}
```

### POST /ingest
```
POST /ingest
Content-Type: application/json
Body: {"source_id":"A","sensor_id":"sensor_001","timestamp":"...","value":42.7,"unit":"celsius"}
Response 200: {"status":"received","sensor_id":"sensor_001"}
```

---

## Acceptance Criteria (P0 — Must Pass for Demo)

- [ ] Simulator posts data from 3 sources continuously
- [ ] Backend receives, normalizes, and groups events by sensor
- [ ] ML model classifies consistent vs conflicting in <200ms
- [ ] Reconciliation engine outputs one trusted value per event group
- [ ] Alert fires when conflict detected
- [ ] Frontend shows all 3 streams live (updating ≤2s)
- [ ] Frontend shows trusted value + ML label + confidence
- [ ] Alert banner visible when conflict active
- [ ] Audit log displays decisions with timestamps
- [ ] End-to-end latency ≤500ms

---

## Biggest Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| SSE not working across React dev server | Medium | Use polling fallback (GET /latest every 2s) |
| ML training takes too long | Low | Use n_estimators=50, max_depth=5 — trains in <30s |
| Frontend charting too complex | Medium | Use Recharts (declarative), not D3 |
| CORS issues | Medium | Enable CORS in FastAPI on all origins during dev |
| Simulator overwhelms backend | Low | 10Hz × 3 sources = 30 req/s — FastAPI handles 1000+ req/s |

---

## What Will NOT Be Built

- ❌ Authentication / user login
- ❌ Docker / containerization
- ❌ PostgreSQL / Redis / any external DB
- ❌ WebSockets (SSE is sufficient)
- ❌ Microservices (single FastAPI process)
- ❌ Cloud deployment (local demo only)
- ❌ Kafka / RabbitMQ
- ❌ Multiple ML models or ensemble
- ❌ User management / roles
- ❌ Historical replay / time travel
- ❌ Physical sensor integration

---

## Agent Assignments

| Agent | Domain | Primary Files | Est. Hours |
|-------|--------|---------------|-----------|
| **Backend Agent** | FastAPI + DB + Engine | `backend/` | 3h |
| **AI/ML Agent** | Model + Training | `ml/` + `backend/ml_service.py` | 2h |
| **Frontend Agent** | React Dashboard | `frontend/` | 3h |

> [!NOTE]
> Backend and ML work in parallel. Frontend can begin with mock data after 30 min and integrate real API at Hour 4.

---

*Plan locked at 08:09 IST. Awaiting approval to dispatch agents.*
