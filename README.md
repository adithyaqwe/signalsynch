# SignalSynch Backend

SignalSynch is a real-time event data reconciliation system. It processes event data from multiple simulated sources, groups them by event, normalizes the data, runs an ML analysis (mocked initially) to identify conflicts, and reconciles the values into a single trusted value. It generates alerts when manual human review is required and emits real-time updates via Socket.IO.

## Technology Stack
- **Node.js** & **Express.js** for the API
- **MongoDB** & **Mongoose** for data storage
- **Socket.IO** for real-time events
- **Axios** for future external ML integration

## Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Copy `.env.example` to `.env` and configure it:
   ```bash
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/signalsynch
   CLIENT_URL=http://localhost:5173
   ML_SERVICE_URL=http://localhost:8000/predict
   USE_MOCK_ML=true
   ```

3. Ensure you have MongoDB running locally or provide a MongoDB Atlas connection string in `MONGODB_URI`.

## Running the Application

To run in development mode with automatic restarts:
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```

## API Documentation

### Events

- **POST `/api/events`**
  Receives event data from simulated sources (supports formats A, B, and C). Accepts single objects or arrays of objects.
  
- **GET `/api/events`**
  Fetch all events. Supports `?page=1&limit=20&eventId=EVT-001&source=SOURCE_A`
  
- **GET `/api/events/:eventId`**
  Get all readings belonging to one event group.

### Reconciliation

- **GET `/api/reconciliation`**
  Get all reconciliation decisions.
  
- **GET `/api/reconciliation/:eventId`**
  Get reconciliation history for one event.
  
- **POST `/api/reconciliation/reconcile/:eventId`**
  Manually trigger reconciliation for an event group.

### Alerts

- **GET `/api/alerts`**
  Get alerts.
  
- **POST `/api/alerts/:id/resolve`**
  Resolve an alert.

### Audit Logs

- **GET `/api/audit-logs`**
  Get all audit logs. Supports `?page=1&limit=20&eventId=EVT-001`

## Socket.IO Events

- `new-event`: Emitted when a new valid event is received.
- `ml-result`: Emitted when ML analysis is completed for an event group.
- `reconciliation-result`: Emitted when a reconciliation decision is made.
- `conflict-alert`: Emitted when an alert is created (e.g., human review required).
- `alert-resolved`: Emitted when an alert is resolved.

## Mock ML Service

The Mock ML service (`src/services/mlService.js`) uses statistical logic (median and deviation) to identify outliers. If all values are within an acceptable range, it returns a `consistent` status. If an outlier is found, it returns `conflicting` along with the source name and realistic anomaly scores.

## Future ML Integration

To switch to a real ML service:
1. Ensure your real ML service conforms to the request/response JSON contracts expected in `mlService.js`.
2. Update the `.env` file: Set `USE_MOCK_ML=false` and provide the correct `ML_SERVICE_URL`.
3. The system will automatically route requests to the external ML service. No changes to controllers or core reconciliation logic are needed.

## Example Requests

**Consistent Event Payload**
```bash
curl -X POST http://localhost:5000/api/events -H "Content-Type: application/json" -d '[
  {
    "eventId": "EVT-CONSISTENT-001",
    "source": "SOURCE_A",
    "value": 72.4,
    "timestamp": "2026-08-23T10:30:00Z"
  },
  {
    "eventId": "EVT-CONSISTENT-001",
    "source": "SOURCE_B",
    "value": 72.5,
    "timestamp": "2026-08-23T10:30:01Z"
  },
  {
    "eventId": "EVT-CONSISTENT-001",
    "source": "SOURCE_C",
    "value": 72.6,
    "timestamp": "2026-08-23T10:30:02Z"
  }
]'
```

**Conflicting Event Payload**
```bash
curl -X POST http://localhost:5000/api/events -H "Content-Type: application/json" -d '[
  {
    "eventId": "EVT-CONFLICT-001",
    "source": "SOURCE_A",
    "value": 72.4,
    "timestamp": "2026-08-23T10:30:00Z"
  },
  {
    "eventId": "EVT-CONFLICT-001",
    "source": "SOURCE_B",
    "value": 72.5,
    "timestamp": "2026-08-23T10:30:01Z"
  },
  {
    "id": "EVT-CONFLICT-001",
    "source": "SOURCE_C",
    "eventValue": 91.8,
    "timestamp": "2026-08-23T10:30:02Z"
  }
]'
```
