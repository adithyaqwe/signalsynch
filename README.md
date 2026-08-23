# ⚡ SignalSynch — Real-Time Telemetry & Data Reconciliation Platform

Production-grade sensor data telemetry platform built with Node.js, Express, MongoDB, Socket.IO, Python Flask, and React (Vite). SignalSynch ingests data from redundant sensors, leverages a Machine Learning model to detect conflicting readings, and automatically resolves them to determine a trusted consensus value in real-time.

## Table of Contents
- [1. Architecture Overview](#1-architecture-overview)
  - [A. High-Level System Architecture](#a-high-level-system-architecture)
  - [B. Database Data Model & Entity Structure](#b-database-data-model--entity-structure)
- [2. Key Architectural Patterns](#2-key-architectural-patterns)
- [3. Environment Variables Configuration](#3-environment-variables-configuration)
- [4. Local Development Setup Guide](#4-local-development-setup-guide)
- [5. Project Directory Structure](#5-project-directory-structure)
- [6. REST API Reference](#6-rest-api-reference)

---

## 1. Architecture Overview

The system is designed as a decoupled, hybrid-polyglot web application with a React single-page application (SPA) client, a high-throughput Express.js backend, and a specialized Python machine learning service. It focuses on real-time event streaming, anomaly detection, and automated data reconciliation.

### A. High-Level System Architecture

- **Frontend SPA**: Built with React, Vite, Tailwind CSS, and Lucide icons. All client state management coordinates with the Express REST backend for historical data and Socket.IO for real-time telemetry streaming. Runs locally on port 3000.
- **Backend API**: Powered by Node.js, Express.js, and Socket.IO. Serves REST endpoints, handles business logic, and broadcasts live events. Runs locally on port 5000.
- **ML Inference Service**: A Python microservice built with Flask and scikit-learn. It serves a pre-trained Random Forest model (`model.pkl`) to evaluate incoming sensor arrays. Runs locally on port 8000.
- **Database Layer**: MongoDB stores raw ingested events, reconciled outputs, system alerts, and historical audit logs.

### B. Database Data Model & Entity Structure

SignalSynch uses Mongoose schemas to represent the following entities:
- **Event**: Raw incoming sensor reading groups.
- **Reconciliation**: The final processed result of an event, including the ML classification, calculated trusted consensus value, and confidence score.
- **Alert**: System-generated alerts for anomalies that fall below the auto-resolution confidence threshold.
- **AuditLog**: Immutable historical logs detailing exactly why and how an event was classified or resolved.

---

## 2. Key Architectural Patterns

- **Hybrid Polyglot Microservices**: Separates I/O-intensive web socket and API handling (Node.js) from CPU-intensive machine learning inference (Python), allowing both to scale independently.
- **Real-Time WebSocket Streaming**: Utilizes Socket.IO to establish a persistent, low-latency connection between the browser and backend. Reconciled events are broadcast instantly without the need for client-side polling.
- **Anomaly Detection & Auto-Resolution**: Feeds multi-sensor data into a Random Forest classifier. If an anomaly is detected (e.g., a "conflicting" classification), the system automatically attempts to isolate the faulty sensor and calculates a trusted consensus value using the remaining healthy sensors.

---

## 3. Environment Variables Configuration

### Backend Setup (`backend/.env`)
Configure the backend database connection and ML service routes. Create a `.env` file in the `backend/` directory:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Yes | Port on which the Express REST API runs | `5000` |
| `MONGO_URI` | Yes | Connection string to the MongoDB instance | `mongodb://127.0.0.1:27017/signalsynch` |
| `ML_SERVICE_URL` | Yes | URL for the Python ML Inference service | `http://127.0.0.1:8000/predict` |
| `USE_MOCK_ML` | No | Bypasses the Python service and uses mock predictions | `false` |

### Frontend Setup (`frontend/.env`)
Configure the frontend build values. Create a `.env` file in the `frontend/` directory (Optional, defaults apply if missing):

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | No | Overrides the default backend REST URL | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | No | Overrides the default backend Socket.IO URL | `http://localhost:5000` |

---

## 4. Local Development Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: 3.9 or higher
- **MongoDB**: Local MongoDB instance running on `localhost:27017`

### Step 1: Install Dependencies
Navigate to the project root and install dependencies for all components:

```bash
# Install backend Node dependencies
cd backend
npm install

# Install Python ML dependencies
pip install flask pandas scikit-learn numpy joblib

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Files
Set up `.env` files in both directories from their respective templates:

```bash
# Set up backend env
cp backend/.env.example backend/.env
```

### Step 3: Run Backend Servers
Inside the `backend/` folder, you need to run both the Node.js API and the Python ML service.

Open Terminal 1 (Python ML Service):
```bash
python server.py
```

Open Terminal 2 (Node.js API):
```bash
npm run dev
```
The Node.js server will start up in development watch mode on `http://localhost:5000`.

### Step 4: Run Frontend Client
Inside the `frontend/` folder, run:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to view the application.

### Step 5: Simulate Data Streams
To test the real-time websocket integration, open a new terminal in `backend/` and run:
```bash
node test_api.js
```
This will dispatch synthetic events to the pipeline, which you will instantly see populate in the React dashboard.

---

## 5. Project Directory Structure

```text
SignalSynch/
├── backend/                  # Node.js API + Python ML Service
│   ├── src/
│   │   ├── config/           # Database configurations
│   │   ├── controllers/      # API Request Handlers
│   │   ├── middleware/       # Express middlewares (errorHandler, etc.)
│   │   ├── models/           # Mongoose Database Schemas (Event, Alert, etc.)
│   │   ├── routes/           # REST Route Handlers
│   │   ├── services/         # Core business logic (Reconciliation, ML, etc.)
│   │   ├── app.js            # Express application setup
│   │   └── socket.js         # Socket.IO websocket configurations
│   ├── server.js             # Node.js Entry point
│   ├── server.py             # Python Flask ML Service Entry point
│   ├── ml_service.py         # Python ML prediction wrapper
│   ├── model.pkl             # Serialized Random Forest model
│   ├── test_api.js           # E2E test script to emit synthetic events
│   ├── .env.example          # Backend environment template
│   └── package.json          # Node dependency configuration
├── frontend/                 # React SPA Client (Vite)
│   ├── public/               # Public static assets
│   ├── src/
│   │   ├── components/       # Shared UI components (Dashboard, Status, etc.)
│   │   ├── hooks/            # Custom React hooks (useSSE, useHealth, etc.)
│   │   ├── lib/              # API clients and validation logic
│   │   ├── App.jsx           # Root layout and application view
│   │   └── main.jsx          # App entrypoint
│   ├── index.html            # HTML template
│   ├── package.json          # Node dependency definition
│   ├── tailwind.config.js    # Tailwind layout utility configurations
│   └── vite.config.js        # Vite bundler configurations
└── README.md
```

---

## 6. REST API Reference

### Health Metrics
- `GET /api/health` — Fetch the current availability of the Node API and the Python ML service.

### Events & Ingestion
- `POST /api/events` — Ingest a new raw sensor event group payload.
- `GET /api/events/:eventId` — Retrieve raw readings for a specific event.

### Reconciliation
- `GET /api/reconciliation` — Retrieve a paginated list of all historically processed reconciliations.
- `GET /api/reconciliation/:eventId` — Retrieve the reconciliation outcome for a specific event.

### Alerts
- `GET /api/alerts` — Fetch pending system alerts that require human review.
- `PUT /api/alerts/:alertId/resolve` — Mark a pending alert as manually resolved.

### Audit Logging
- `GET /api/audit-logs` — Retrieve immutable historical audit records for tracking system decisions.
