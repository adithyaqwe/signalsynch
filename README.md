
# SignalSynch

SignalSynch is a real-time sensor telemetry and data reconciliation platform. It ingests data from multiple redundant sensors, leverages a Machine Learning model to detect anomalies or conflicting readings, and automatically resolves them to determine a trusted consensus value.

The platform provides a real-time dashboard to monitor sensor streams, view automated reconciliations, and review alerts for anomalies that require human intervention.

## System Architecture

The system is composed of three main components:

1. **Frontend (`/frontend`)**: A React dashboard built with Vite and TailwindCSS that visualizes live sensor data, displays the real-time reconciliation stream, and provides a searchable audit log. It connects to the backend via REST for historical data and Socket.IO for real-time streams.
2. **Backend API (`/backend`)**: A Node.js/Express server that acts as the central hub. It ingests raw events, handles data persistence with MongoDB, coordinates with the ML Service, and broadcasts results to connected clients via WebSockets.
3. **ML Inference Service (`/backend/server.py`)**: A Python/Flask microservice that loads a pre-trained scikit-learn Random Forest model (`model.pkl`) to analyze incoming sensor groups and classify them as `consistent` or `conflicting`.

## Prerequisites

To run this project locally, you will need:
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Running locally on the default port `27017`)

## Installation & Setup

### 1. Backend (Node.js API)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example (or verify defaults):
   ```bash
   cp .env.example .env
   ```
   *Ensure `ML_SERVICE_URL=http://localhost:8000/predict` and `USE_MOCK_ML=false` are set if running the Python ML service.*
4. Start the development server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

### 2. ML Service (Python Flask)

1. Navigate to the backend directory (where the Python files are located):
   ```bash
   cd backend
   ```
2. Install the required Python packages:
   ```bash
   pip install flask pandas scikit-learn numpy joblib
   ```
3. Start the Flask server:
   ```bash
   python server.py
   ```
   The ML inference service will run on `http://localhost:8000`.

### 3. Frontend (React Dashboard)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`.

## Testing the Pipeline

You can simulate a stream of incoming events by running the provided test script. With all three services (Node Backend, Python ML, React Frontend) running:

1. Open a new terminal in the `backend` directory.
2. Run the test script to emit mock sensor data:
   ```bash
   node test_api.js
   ```
3. Open your browser to `http://localhost:3000`. You will see the dashboard light up with real-time reconciliations, alerts, and historical audit logs.

## API Documentation

For frontend integration details, please refer to the [API Documentation](backend/api_documentation.md).
