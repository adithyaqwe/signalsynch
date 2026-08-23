import React, { useState } from 'react';
import { SENSOR_BASELINES } from '../mockData';

export default function AlertBanner({ alerts, onAcknowledge }) {
  // Only recent alerts (last 60s)
  const recent = alerts.filter((a) => Date.now() - new Date(a.timestamp).getTime() < 60000);

  if (recent.length === 0) return null;

  const latest = recent[0];
  const label = SENSOR_BASELINES[latest.sensor_id]?.label || latest.sensor_id;

  return (
    <div className="bg-neo-red border-3 border-black shadow-brutal p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚨</span>
        <div>
          <p className="font-black text-white uppercase">
            Conflict Detected — {label}
          </p>
          <p className="text-sm text-white/80 font-medium">{latest.explanation}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {recent.length > 1 && (
          <span className="bg-black text-white px-3 py-1 font-black text-sm">
            +{recent.length - 1} more
          </span>
        )}
        <button
          onClick={() => onAcknowledge(latest.reconciliation_id)}
          className="bg-white border-3 border-black px-4 py-2 font-black text-sm hover:bg-gray-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none shadow-brutal-sm tracking-wider"
        >
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  );
}
