// ============================================================
// SignalSynch — Socket Hook (useSSE -> useSocket under the hood)
// ============================================================
// Connects to Node.js backend via Socket.IO
// Maps backend event format to frontend format
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  USE_MOCK,
  BACKEND_URL,
  POLL_URL,
  SENSORS,
  generateMockEvent,
  generateInitialHistory,
} from '../mockData';

const MAX_HISTORY_PER_SENSOR = 30;
const POLL_INTERVAL_MS = 2000;

export default function useSSE() {
  const [events, setEvents] = useState({});
  const [latestEvents, setLatestEvents] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // Process a single reconciliation event into state
  const processEvent = useCallback((event) => {
    const { sensor_id } = event;

    setEvents((prev) => {
      const history = prev[sensor_id] || [];
      // Deduplicate
      if (history.find((e) => e.reconciliation_id === event.reconciliation_id)) return prev;
      const updated = [...history, event].slice(-MAX_HISTORY_PER_SENSOR);
      return { ...prev, [sensor_id]: updated };
    });

    setLatestEvents((prev) => ({ ...prev, [sensor_id]: event }));

    if (event.alert) {
      setAlerts((prev) => {
        if (prev.find((a) => a.reconciliation_id === event.reconciliation_id)) return prev;
        return [event, ...prev].slice(0, 50);
      });
    }
  }, []);

  // Human Review Acknowledgment
  const acknowledgeAlert = useCallback((reconciliationId) => {
    // 1. Remove from active alert banner
    setAlerts((prev) => prev.filter((a) => a.reconciliation_id !== reconciliationId));
    
    // 2. Mark as acknowledged in event history for audit log
    setEvents((prev) => {
      const next = { ...prev };
      for (const sensorId in next) {
        next[sensorId] = next[sensorId].map(e => 
          e.reconciliation_id === reconciliationId ? { ...e, acknowledged: true } : e
        );
      }
      return next;
    });

    // We can also POST to backend to resolve if we wanted
    if (!USE_MOCK) {
      fetch(`${BACKEND_URL}/api/alerts/${reconciliationId}/resolve`, { method: 'POST' }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (USE_MOCK) {
      // ── Mock Mode ──
      setConnectionStatus('mock');

      const initialHistory = generateInitialHistory();
      setEvents(initialHistory);

      const latest = {};
      for (const sensorId of SENSORS) {
        const history = initialHistory[sensorId];
        latest[sensorId] = history[history.length - 1];
      }
      setLatestEvents(latest);

      const initialAlerts = Object.values(initialHistory)
        .flat()
        .filter((e) => e.alert)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
      setAlerts(initialAlerts);

      let sensorIndex = 0;
      intervalRef.current = setInterval(() => {
        const sensorId = SENSORS[sensorIndex % SENSORS.length];
        const newEvent = generateMockEvent(sensorId);
        processEvent(newEvent);
        sensorIndex++;
      }, POLL_INTERVAL_MS);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      // ── Live Mode via Socket.IO ──
      setConnectionStatus('connecting');

      // Fetch initial history from backend REST API
      fetch(`${BACKEND_URL}/api/reconciliation?page=1&limit=50`)
        .then(res => res.json())
        .then(json => {
          const records = json.data || [];
          for (let i = records.length - 1; i >= 0; i--) {
            const r = records[i];
            const sensor_id = r.eventId && r.eventId.startsWith('sensor_')
              ? r.eventId.split('_').slice(0, 2).join('_')
              : (r.sensorId || r.eventId || 'sensor_001');

            const isConflicting = r.mlResult?.status === 'conflicting' || r.status === 'CONFLICT_DETECTED' || r.status === 'AUTO_RESOLVED';
            const translated = {
              reconciliation_id: r.eventId + '_' + (r.updatedAt || r.createdAt || Date.now()),
              sensor_id: sensor_id,
              timestamp: r.updatedAt || r.createdAt || new Date().toISOString(),
              source_values: {},
              trusted_value: r.trustedValue,
              ml_label: isConflicting ? 'conflicting' : 'consistent',
              ml_confidence: r.confidence || 0.95,
              alert: Boolean(r.requiresHumanReview || isConflicting),
              explanation: r.reason,
            };
            if (r.sourceValues) {
              r.sourceValues.forEach((sv) => {
                const src = sv.source.replace('SOURCE_', '');
                translated.source_values[src] = sv.value;
              });
            }
            processEvent(translated);
          }
        })
        .catch(err => console.log('[Socket] Initial history fetch error:', err.message));

      const socket = io(BACKEND_URL, {
        reconnectionDelayMax: 10000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected to backend');
        setConnectionStatus('connected');
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from backend');
        setConnectionStatus('offline');
      });

      // Listen for reconciliation results
      socket.on('reconciliation-result', (data) => {
        try {
          // Map Node backend structure to Frontend structure
          const sensor_id = data.eventId && data.eventId.startsWith('sensor_')
            ? data.eventId.split('_').slice(0, 2).join('_')
            : (data.sensorId || data.eventId || 'sensor_001');

          const isConflicting = data.mlResult?.status === 'conflicting' || data.status === 'CONFLICT_DETECTED' || data.status === 'AUTO_RESOLVED';
          const translated = {
            reconciliation_id: `${data.eventId}_${data.updatedAt || Date.now()}`,
            sensor_id: sensor_id,
            timestamp: data.updatedAt || new Date().toISOString(),
            source_values: {},
            trusted_value: data.trustedValue,
            ml_label: isConflicting ? 'conflicting' : 'consistent',
            ml_confidence: data.confidence || (data.mlResult ? data.mlResult.confidence : 0.95),
            alert: Boolean(data.requiresHumanReview || isConflicting),
            explanation: data.reason,
          };
          
          if (data.sourceValues) {
            data.sourceValues.forEach((sv) => {
              const src = sv.source.replace('SOURCE_', '');
              translated.source_values[src] = sv.value;
            });
          }

          processEvent(translated);
        } catch (err) {
          console.error('[Socket] Parse error:', err);
        }
      });

      socket.on('conflict-alert', (data) => {
        try {
          const alertEvent = {
            reconciliation_id: data.alertId || `${data.eventId}_${Date.now()}`,
            sensor_id: data.eventId,
            timestamp: new Date().toISOString(),
            alert: true,
            explanation: data.message,
            ml_label: 'conflicting',
            ml_confidence: 0.95
          };
          setAlerts((prev) => [alertEvent, ...prev.filter(a => a.reconciliation_id !== alertEvent.reconciliation_id)].slice(0, 50));
        } catch(e) {}
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [processEvent]);

  return {
    events,
    latestEvents,
    alerts,
    connectionStatus,
    acknowledgeAlert,
  };
}
