import React, { useState, useMemo } from 'react';
import { Activity, Wifi, WifiOff, Radio } from 'lucide-react';
import useSSE from './hooks/useSSE';
import { SENSORS, SENSOR_BASELINES, computeStats, triggerAnomaly, USE_MOCK } from './mockData';
import StreamPanel from './components/StreamPanel';
import ReconciliationPanel from './components/ReconciliationPanel';
import AlertBanner from './components/AlertBanner';
import AuditLog from './components/AuditLog';

export default function App() {
  const { events, latestEvents, alerts, connectionStatus, acknowledgeAlert } = useSSE();
  const [selectedSensor, setSelectedSensor] = useState('sensor_001');

  const allEvents = useMemo(() => Object.values(events).flat(), [events]);
  const stats = useMemo(() => computeStats(allEvents), [allEvents]);

  const sensorEvents = events[selectedSensor] || [];
  const latestEvent = latestEvents[selectedSensor];

  const [isInjecting, setIsInjecting] = useState(false);

  const handleForceAnomaly = async () => {
    setIsInjecting(true);
    triggerAnomaly();

    if (!USE_MOCK) {
      try {
        const config = SENSOR_BASELINES[selectedSensor] || { base: 50 };
        const base = config.base;
        const now = new Date().toISOString();
        const spike = (Math.random() > 0.5 ? 1 : -1) * (config.range ? config.range * 0.8 : 12.0);
        const payload = [
          { eventId: selectedSensor, source: 'SOURCE_A', value: parseFloat((base + 0.3).toFixed(2)), timestamp: now },
          { eventId: selectedSensor, source: 'SOURCE_B', value: parseFloat((base - 0.2).toFixed(2)), timestamp: now },
          { eventId: selectedSensor, source: 'SOURCE_C', value: parseFloat((base + spike).toFixed(2)), timestamp: now }
        ];

        await fetch(`${BACKEND_URL}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Failed to post anomaly event to backend:', err);
      }
    }

    setTimeout(() => setIsInjecting(false), 800);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* ── Header ── */}
      <header className="bg-neo-yellow border-b-3 border-black px-5 py-2.5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center">
              <Activity className="w-5 h-5 text-neo-yellow" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight">SignalSynch</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleForceAnomaly}
              className={`btn-neo text-xs px-3 py-1.5 uppercase font-black tracking-wider transition-all ${
                isInjecting ? 'bg-neo-red text-white scale-95' : 'bg-neo-purple text-black hover:bg-purple-300'
              }`}
              title="Inject a high-deviation anomaly to test ML conflict detection"
            >
              {isInjecting ? '🚨 INJECTING...' : '⚡ Force Anomaly'}
            </button>
            <div className="flex items-center gap-2 border-3 border-black bg-white px-3 py-1 shadow-brutal-sm">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-700" />
              ) : connectionStatus === 'mock' ? (
                <Radio className="w-4 h-4 text-orange-600" />
              ) : connectionStatus === 'polling' ? (
                <Activity className="w-4 h-4 text-orange-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm font-bold uppercase">
                {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'mock' ? 'Mock' : connectionStatus === 'polling' ? 'Polling' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 py-4 space-y-4">
        {/* ── Alert Banner ── */}
        <AlertBanner alerts={alerts} onAcknowledge={acknowledgeAlert} />

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Events</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
          <div className="card bg-neo-red/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Conflicts</p>
            <p className="text-2xl font-black text-red-700">{stats.conflicts}</p>
          </div>
          <div className="card bg-neo-green/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Consistent</p>
            <p className="text-2xl font-black text-green-800">{stats.consistent}</p>
          </div>
          <div className="card bg-neo-blue/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">ML Confidence</p>
            <p className="text-2xl font-black text-blue-800">{stats.avgConfidence}%</p>
          </div>
        </div>

        {/* ── Sensor Tabs & Anomaly Trigger ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {SENSORS.map((id) => {
              const active = id === selectedSensor;
              const hasAlert = latestEvents[id]?.alert;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedSensor(id)}
                  className={`btn-neo text-sm ${
                    active
                      ? 'bg-neo-yellow'
                      : hasAlert
                      ? 'bg-neo-red text-white'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {hasAlert && !active && <span className="mr-1">⚠</span>}
                  {SENSOR_BASELINES[id]?.label || id}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleForceAnomaly}
            disabled={isInjecting}
            className="btn-neo text-xs px-3.5 py-2 uppercase font-black tracking-wider bg-purple-400 text-black hover:bg-purple-300 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            style={{ backgroundColor: '#c084fc', border: '3px solid black', boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)' }}
          >
            {isInjecting ? '🚨 INJECTING CONFLICT...' : '⚡ INJECT CONFLICT (DEMO)'}
          </button>
        </div>

        {/* ── Main Panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <StreamPanel sensorId={selectedSensor} events={sensorEvents} />
          </div>
          <div className="lg:col-span-1">
            <ReconciliationPanel event={latestEvent} sensorId={selectedSensor} />
          </div>
        </div>

        {/* ── Audit Log ── */}
        <AuditLog events={allEvents} />
      </main>
    </div>
  );
}
