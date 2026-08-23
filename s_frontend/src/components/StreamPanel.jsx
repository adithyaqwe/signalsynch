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
  const config = SENSOR_BASELINES[sensorId];

  const chartData = useMemo(() => {
    return events.map((e) => {
      const time = new Date(e.timestamp);
      return {
        time: time.toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        'Source A': e.source_values?.A ?? null,
        'Source B': e.source_values?.B ?? null,
        'Source C': e.source_values?.C ?? null,
        Trusted: e.trusted_value,
      };
    });
  }, [events]);

  const yDomain = useMemo(() => {
    if (!config?.base || !config?.range) return [0, 100];
    return [config.base - config.range, config.base + config.range];
  }, [config]);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-black uppercase">Live Streams</h2>
        <div className="flex gap-3 text-[10px] font-bold">
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-blue-500" /> A: {SOURCE_IDENTITIES.A}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-purple-500" /> B: {SOURCE_IDENTITIES.B}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-cyan-500" /> C: {SOURCE_IDENTITIES.C}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-1 bg-green-500" style={{ borderTop: '2px dashed #22c55e' }} /> Trusted
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 font-bold mb-2">
        {config?.label} ({config?.unit}) · Last {chartData.length} readings
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#000', fontSize: 10, fontWeight: 700 }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: '#000', fontSize: 10, fontWeight: 700 }}
            axisLine={{ stroke: '#000', strokeWidth: 2 }}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="Source A" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="Source B" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="Source C" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="Trusted" stroke="#22c55e" strokeWidth={3} strokeDasharray="6 3" dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
