import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { SOURCE_COLORS, SOURCE_IDENTITIES, SENSOR_BASELINES } from '../mockData';

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-3 border-black p-3 shadow-brutal-sm">
      <p className="text-xs font-bold mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="w-3 h-1" style={{ backgroundColor: entry.color }} />
          <span className="font-medium">{entry.name}:</span>
          <span className="font-bold">{entry.value?.toFixed(2) ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function StreamPanel({ sensorId, events }) {
  const config = SENSOR_BASELINES[sensorId] || { base: 50, range: 20, unit: 'units', label: sensorId };

  const chartData = useMemo(() => {
    if (!events || events.length === 0) return [];
    return events.map((e) => {
      const time = new Date(e.timestamp);
      return {
        time: isNaN(time.getTime()) ? '' : time.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        'Source A': typeof e.source_values?.A === 'number' ? e.source_values.A : null,
        'Source B': typeof e.source_values?.B === 'number' ? e.source_values.B : null,
        'Source C': typeof e.source_values?.C === 'number' ? e.source_values.C : null,
        Trusted: typeof e.trusted_value === 'number' ? e.trusted_value : null,
      };
    });
  }, [events]);

  const yDomain = useMemo(() => {
    const allValues = (events || []).flatMap(e => [
      e.source_values?.A,
      e.source_values?.B,
      e.source_values?.C,
      e.trusted_value
    ]).filter(v => typeof v === 'number' && !isNaN(v));

    if (allValues.length === 0) {
      const base = config.base || 50;
      const span = config.range || 15;
      return [Math.floor(base - span), Math.ceil(base + span)];
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const diff = max - min;
    const padding = diff > 0 ? Math.max(diff * 0.15, 1.0) : Math.max(min * 0.1, 2.0);

    return [
      parseFloat((min - padding).toFixed(1)),
      parseFloat((max + padding).toFixed(1))
    ];
  }, [events, config]);

  return (
    <div className="card h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-base font-black uppercase">Live Streams</h2>
          <div className="flex flex-wrap gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 border border-black inline-block" /> A: {SOURCE_IDENTITIES.A}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-purple-500 border border-black inline-block" /> B: {SOURCE_IDENTITIES.B}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-cyan-500 border border-black inline-block" /> C: {SOURCE_IDENTITIES.C}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 border border-black border-dashed inline-block" /> Trusted Reconciled
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 font-bold mb-2">
          {config?.label} ({config?.unit}) · Last {chartData.length} data points
        </p>
      </div>

      <div className="w-full flex-1 min-h-[260px]">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#000', fontSize: 10, fontWeight: 700 }}
              axisLine={{ stroke: '#000', strokeWidth: 2 }}
              tickLine={{ stroke: '#000' }}
              minTickGap={30}
            />
            <YAxis
              domain={yDomain}
              tick={{ fill: '#000', fontSize: 10, fontWeight: 700 }}
              axisLine={{ stroke: '#000', strokeWidth: 2 }}
              tickLine={{ stroke: '#000' }}
              width={55}
              tickFormatter={(v) => typeof v === 'number' ? v.toFixed(1) : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Source A" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
            <Line type="monotone" dataKey="Source B" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
            <Line type="monotone" dataKey="Source C" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
            <Line type="monotone" dataKey="Trusted" stroke="#16a34a" strokeWidth={3.5} strokeDasharray="5 4" dot={{ r: 3, fill: '#16a34a' }} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
