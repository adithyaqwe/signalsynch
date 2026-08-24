# SignalSynch AI — Real-Time Telemetry Reconciliation Platform

SignalSynch is a real-time sensor telemetry and data reconciliation platform designed for mission-critical industrial IoT environments. It ingests redundant sensor streams (Sources A, B, and C), leverages a sub-10ms Machine Learning Random Forest classifier to detect conflicting or anomalous readings, deterministically computes consensus trusted values, and broadcasts decisions to an operator console over WebSockets.

---

## 🌐 Live Deployments

| Component | Platform | Live URL |
| :--- | :--- | :--- |
| **Operator Console (`s_frontend`)** | **Vercel** | **[https://signalsynch-three.vercel.app](https://signalsynch-three.vercel.app)** |
| **Backend API & WebSockets** | **Render** | **[https://signalsynch-x7r4.onrender.com](https://signalsynch-x7r4.onrender.com)** |
| **ML Inference Service** | **Render** | `https://signalsynch-x7r4.onrender.com/predict` (Internal Port 8000) |
| **Cloud Database** | **MongoDB Atlas** | Managed Replica Set (M0 Cluster) |
| **GitHub Repository** | **GitHub** | **[https://github.com/adithyaqwe/signalsynch](https://github.com/adithyaqwe/signalsynch)** |

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              TELEMETRY STREAM GENERATOR                     │
│  Source A (Baseline + Noise)                                │
│  Source B (Baseline + Noise) ──► HTTP POST /api/events      │
│  Source C (Periodic Outlier)                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    NODE.JS BACKEND API                      │
│                                                             │
│  1. Ingestion & Multi-Format Normalizer                     │
│  2. Asynchronous Cohort Aggregation                         │
│  3. Microservice Call ──► Python Flask /predict (Port 8000) │
│  4. Deterministic Consensus Filter & Trusted Value Engine   │
│  5. Real-Time Broadcaster (Socket.IO)                       │
│  6. Ephemeral In-Memory Store (Events, Reconciliations, Alerts, AuditLogs)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│     MONGODB ATLAS         │       │     OPERATOR CONSOLE      │
│  - Raw Event History      │       │     (React + Tailwind)    │
│  - Reconciliation Records │       │  - Live Recharts Streams  │
│  - Immutable Audit Logs   │       │  - Top-Level KPI Cards    │
│  - Active Conflict Alerts │       │  - Decision & XAI Panels  │
└───────────────────────────┘       │  - Alert Acknowledge Flow │
                                    └───────────────────────────┘
```

---

## 🧠 Machine Learning & Consensus Engine

### 1. ML Anomaly Classifier
* **Model**: `RandomForestClassifier` (`n_estimators=50`, `max_depth=6`, `scikit-learn 1.4+`)
* **Feature Vector**: `[val_A, val_B, val_C, mean, std_dev, max_deviation, range]`
* **Output**: Label (`consistent` vs `conflicting`) + Confidence Probability Score ($0.0 \text{ to } 1.0$)
* **Performance**: **100% Validation Accuracy** on synthetic baseline datasets. **End-to-end inference latency** (Node→Flask→RF→Node) is measured live — query `/api/metrics` for real runtime numbers. The RandomForest model itself runs in <5ms; HTTP round-trip varies by deployment.
* **Artifacts**: [backend/train_model.py](backend/train_model.py) (reproducible training script) $\rightarrow$ [backend/model.pkl](backend/model.pkl) $\rightarrow$ [backend/server.py](backend/server.py).

### 2. Reconciliation & Outlier Removal Logic
* **If `consistent`**: $\text{Trusted Value} = \text{Median}(V_A, V_B, V_C)$.
* **If `conflicting`**:
  1. Computes deviation from cohort mean: $\Delta_i = |V_i - \mu|$.
  2. Isolates the maximum deviation source ($V_{\text{outlier}}$).
  3. Computes ground-truth trusted value: $\text{Trusted Value} = \text{Median}(\text{remaining non-outlier sources})$.
  4. Generates a plain-language explanation (e.g. *"Source C flagged as outlier (+4.8σ). Trusted: median(A, B)"*).
  5. Automatically creates an actionable alert for human operator review.

---

## 🏭 Industrial Sensor Profiles

The platform supports 10 distinct physical sensor telemetry channels:

| Sensor ID | Sensor Name | Physical Unit | Baseline Value | Operational Span |
| :--- | :--- | :--- | :--- | :--- |
| `sensor_001` | Reactor Core Temp | °C | 42.0 °C | $\pm 15$ °C |
| `sensor_002` | Pressure Vessel A | kPa | 101.3 kPa | $\pm 20$ kPa |
| `sensor_003` | Coolant pH Level | pH | 7.2 pH | $\pm 4$ pH |
| `sensor_004` | Turbine Speed | RPM | 1,450 RPM | $\pm 200$ RPM |
| `sensor_005` | Grid Voltage | Volts | 220.0 V | $\pm 40$ V |
| `sensor_006` | Cooling Intake Temp | °C | 55.5 °C | $\pm 15$ °C |
| `sensor_007` | Main Valve Pressure | psi | 300.0 psi | $\pm 50$ psi |
| `sensor_008` | Flow Rate Sensor | gal/s | 12.4 gal/s | $\pm 5$ gal/s |
| `sensor_009` | Generator Output | kW | 88.8 kW | $\pm 20$ kW |
| `sensor_010` | Secondary Turbine | RPM | 1,000 RPM | $\pm 150$ RPM |

---

## 💻 Local Installation & Setup

### Prerequisites
* **Node.js**: v18+
* **Python**: v3.9+
* **MongoDB**: Local MongoDB on port `27017` or MongoDB Atlas URI

### 1. Clone Repository
```bash
git clone https://github.com/adithyaqwe/signalsynch.git
cd signalsynch
```

### 2. Configure Environment
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/signalsynch
CLIENT_URL=http://localhost:3000
ML_SERVICE_URL=http://127.0.0.1:8000/predict
USE_MOCK_ML=false
```

### 3. Start Services (In separate terminals)

**Terminal 1 — Python ML Service**
```bash
cd backend
pip install flask scikit-learn pandas numpy joblib
python3 server.py
# Running on http://localhost:8000
```

**Terminal 2 — Node.js Backend API**
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000
```

**Terminal 3 — Operator Console Frontend**
```bash
cd s_frontend
npm install
npm run dev
# Running on http://localhost:3000
```

**Terminal 4 — Continuous Telemetry Simulator**
```bash
cd backend
node simulator.js
```

---

## 🧪 Pipeline Verification & Automated Tests

To test the entire pipeline locally without running the continuous stream:
```bash
cd backend
node test_api.js
```

Output:
```text
1. Testing Health Check Endpoint: Status 200 OK
2. Testing POST /events (Consistent Group): 201 Processed
3. Testing POST /events (Conflicting Group): 201 Processed
4. Testing GET /events/:eventId: Fetched Readings
5. Testing GET /reconciliation: Total Reconciliations Found
6. Testing GET /alerts: Verified Alert Dispatch
7. Testing GET /audit-logs: Verified Immutable Storage
--- All Tests Completed Successfully ---
```

Live performance benchmarks (after ~30s of simulator traffic):
```bash
curl http://localhost:5000/api/metrics
```
```json
{
  "eventIngestion": { "count": 300, "avgLatencyMs": 4.2, "estimatedHz": 10.1 },
  "reconciliation": {
    "avgTotalMs": 8.7,
    "avgMlInferenceMs": 0.4,
    "avgDecisionLogicMs": 6.1,
    "avgDbWriteMs": 0.3,
    "avgSocketEmitMs": 1.9
  },
  "slaCompliance": { "hz_met": true, "response_met": true, "ml_met": true }
}
```

---

## 📁 Repository Structure

```
signalsynch/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB Atlas configuration
│   │   ├── controllers/     # Event, reconciliation, alert controllers
│   │   ├── models/          # Event, Reconciliation, AuditLog schemas
│   │   ├── services/        # ML communication, consensus normalization
│   │   └── socket.js        # Socket.IO WebSocket server
│   ├── Dockerfile           # Multi-runtime Docker build (Node 20 + Python)
│   ├── model.pkl            # Pre-trained Random Forest model
│   ├── train_model.py       # ML synthetic data generation & training script
│   ├── ml_service.py        # Feature extraction & inference wrapper
│   ├── server.py            # Python Flask ML inference microservice
│   ├── simulator.js         # Continuous 10-sensor telemetry feed pump
│   └── test_api.js          # End-to-end integration test suite
├── s_frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertBanner.jsx         # Live conflict notification & ACK
│   │   │   ├── AuditLog.jsx            # Filterable historical decision table
│   │   │   ├── ReconciliationPanel.jsx # Trusted consensus & outlier highlights
│   │   │   └── StreamPanel.jsx         # Real-time multi-source Recharts
│   │   ├── hooks/
│   │   │   └── useSSE.js               # Socket.IO real-time stream hook
│   │   ├── mockData.js                 # Sensor baselines & cloud URL config
│   │   └── App.jsx                     # Operator dashboard console layout
│   ├── package.json
│   └── vite.config.js
├── Dockerfile               # Root deployment container for Render
└── README.md
```
