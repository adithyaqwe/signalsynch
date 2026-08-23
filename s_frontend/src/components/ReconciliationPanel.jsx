import React from 'react';
import { SENSOR_BASELINES, SOURCE_IDENTITIES } from '../mockData';

export default function ReconciliationPanel({ event, sensorId }) {
  const config = SENSOR_BASELINES[sensorId];

  if (!event) {
    return (
      <div className="card h-full flex items-center justify-center">
        <p className="text-gray-500 font-bold">Waiting for data...</p>
      </div>
    );
  }

  const isConflicting = event.ml_label === 'conflicting';

  return (
    <div className="card h-full space-y-3">
      {/* Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black uppercase">Decision</h2>
        <span className={isConflicting ? 'badge-conflict' : 'badge-ok'}>
          {isConflicting ? '⚠ CONFLICT' : '✓ OK'}
        </span>
      </div>

      {/* Trusted Value */}
      <div className={`border-3 border-black p-3 text-center shadow-brutal-sm ${
        isConflicting ? 'bg-neo-red/20' : 'bg-neo-green/30'
      }`}>
        <p className="text-[10px] font-bold uppercase text-gray-600">Trusted Value</p>
        <p className="text-4xl font-black">{event.trusted_value?.toFixed(2)}</p>
        <p className="text-xs font-bold text-gray-500 mt-1">{config?.unit}</p>
      </div>

      {/* Source Readings */}
      <div>
        <p className="text-xs font-bold uppercase mb-2">Source Readings</p>
        <div className="grid grid-cols-3 gap-2">
          {['A', 'B', 'C'].map((src) => {
            const val = event.source_values?.[src];
            const isOutlier = isConflicting && (
              event.conflictingSources?.includes(src) ||
              event.conflictingSources?.includes(`SOURCE_${src}`) ||
              event.explanation?.includes(`Source ${src}`) ||
              event.explanation?.includes(`SOURCE_${src}`)
            );
            return (
              <div
                key={src}
                className={`border-3 border-black p-2 text-center flex flex-col justify-center ${
                  isOutlier ? 'bg-neo-red text-white' : 'bg-white'
                }`}
              >
                <p className="text-xs font-black">{src}</p>
                <p className="text-[9px] font-bold uppercase mb-1 opacity-80 leading-tight">
                  {SOURCE_IDENTITIES[src]}
                </p>
                <p className="text-lg font-black">{val?.toFixed(1) ?? '—'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ML Confidence */}
      <div>
        <div className="flex justify-between text-xs font-bold mb-1">
          <span>ML Confidence</span>
          <span>{(event.ml_confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 border-3 border-black bg-white">
          <div
            className={`h-full ${
              event.ml_confidence >= 0.9 ? 'bg-neo-green' : event.ml_confidence >= 0.7 ? 'bg-neo-yellow' : 'bg-neo-red'
            }`}
            style={{ width: `${(event.ml_confidence * 100).toFixed(0)}%` }}
          />
        </div>
      </div>

      {/* Explainability — Bonus Feature */}
      <div className="border-3 border-black bg-neo-blue/20 p-2.5">
        <p className="text-[10px] font-black uppercase mb-1">💡 Why this decision?</p>
        <p className="text-sm font-medium leading-relaxed">{event.explanation}</p>
      </div>
    </div>
  );
}
