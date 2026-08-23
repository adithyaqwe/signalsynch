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

          <div className="flex items-center gap-4">
            {USE_MOCK && (
              <button onClick={triggerAnomaly} className="btn-neo text-xs bg-neo-purple px-2 py-1 uppercase text-black">
                ⚡ Force Anomaly
              </button>
            )}
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

        {/* ── Sensor Tabs ── */}
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
