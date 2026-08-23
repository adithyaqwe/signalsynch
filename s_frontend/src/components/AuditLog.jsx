import React, { useMemo, useState, useEffect } from 'react';
import { SENSOR_BASELINES, USE_MOCK, AUDIT_URL } from '../mockData';

export default function AuditLog({ events }) {
  const [filter, setFilter] = useState('all');
  const [auditRecords, setAuditRecords] = useState([]);

  // In live mode, fetch historical records from /audit on mount
  useEffect(() => {
    if (USE_MOCK) return;

    async function fetchAudit() {
      try {
        const res = await fetch(`${AUDIT_URL}?page=1&limit=50`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        
        const rawRecords = json.data || [];
        const records = rawRecords.map((r) => {
          const sensor_id = r.eventId && r.eventId.startsWith('sensor_')
            ? r.eventId.split('_').slice(0, 2).join('_')
            : (r.sensorId || r.eventId || 'sensor_001');

          const isConflicting = r.mlResult?.status === 'conflicting' || r.status === 'CONFLICT_DETECTED' || r.status === 'AUTO_RESOLVED';
          const translated = {
            reconciliation_id: r.eventId + '_' + (r.updatedAt || r.createdAt || r._id),
            sensor_id: sensor_id,
            timestamp: r.createdAt || r.updatedAt || new Date().toISOString(),
            source_values: {},
            trusted_value: r.trustedValue,
            ml_label: isConflicting ? 'conflicting' : 'consistent',
            ml_confidence: r.confidence || (r.mlResult ? r.mlResult.confidence : 0.95),
            alert: Boolean(r.requiresHumanReview || isConflicting),
            explanation: r.reason,
            acknowledged: false,
          };
          if (r.sourceValues) {
            r.sourceValues.forEach((sv) => {
              const src = sv.source.replace('SOURCE_', '');
              translated.source_values[src] = sv.value;
            });
          }
          return translated;
        });
        
        setAuditRecords(records);
      } catch (err) {
        console.error('[Audit] Failed to fetch:', err);
      }
    }

    fetchAudit();
    // Re-fetch every 10 seconds to pick up new decisions
    const interval = setInterval(fetchAudit, 10000);
    return () => clearInterval(interval);
  }, []);

  // Merge SSE events with fetched audit records (dedup by reconciliation_id)
  const allRecords = useMemo(() => {
    const seen = new Set();
    const merged = [];

    // SSE events first (freshest)
    for (const e of events) {
      if (e.reconciliation_id && !seen.has(e.reconciliation_id)) {
        seen.add(e.reconciliation_id);
        merged.push(e);
      }
    }

    // Then audit records from backend
    for (const r of auditRecords) {
      if (r.reconciliation_id && !seen.has(r.reconciliation_id)) {
        seen.add(r.reconciliation_id);
        merged.push(r);
      }
    }

    return merged;
  }, [events, auditRecords]);

  const filtered = useMemo(() => {
    let list = [...allRecords].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (filter !== 'all') list = list.filter((e) => e.ml_label === filter);
    return list.slice(0, 100);
  }, [allRecords, filter]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-black uppercase">Audit Log</h2>
        <div className="flex gap-2">
          {['all', 'conflicting', 'consistent'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-neo text-xs py-1 px-3 ${
                filter === f
                  ? f === 'conflicting'
                    ? 'bg-neo-red text-white'
                    : f === 'consistent'
                    ? 'bg-neo-green'
                    : 'bg-neo-yellow'
                  : 'bg-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[300px] overflow-y-auto border-3 border-black">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black text-white text-xs font-black uppercase">
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Sensor</th>
              <th className="text-center px-3 py-2">A</th>
              <th className="text-center px-3 py-2">B</th>
              <th className="text-center px-3 py-2">C</th>
              <th className="text-center px-3 py-2">Trusted</th>
              <th className="text-center px-3 py-2">Status</th>
              <th className="text-center px-3 py-2">Conf.</th>
              <th className="text-left px-3 py-2">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => {
              const bad = e.ml_label === 'conflicting';
              return (
                <tr
                  key={e.reconciliation_id || idx}
                  className={`border-t-2 border-black font-medium ${
                    bad ? 'bg-neo-red/10' : 'bg-white'
                  }`}
                >
                  <td className="px-3 py-2 text-xs font-mono font-bold whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold">
                    {SENSOR_BASELINES[e.sensor_id]?.label || e.sensor_id}
                  </td>
                  <td className="px-3 py-2 text-xs text-center">{e.source_values?.A?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-center">{e.source_values?.B?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-center">{e.source_values?.C?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-center font-black">{e.trusted_value?.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={bad ? 'badge-conflict' : 'badge-ok'}>
                        {bad ? 'CONFLICT' : 'OK'}
                      </span>
                      {bad && e.acknowledged && (
                        <span className="text-[9px] font-black bg-black text-white px-1">
                          ACK'D
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-center font-bold">
                    {(e.ml_confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[250px] leading-tight">{e.explanation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
