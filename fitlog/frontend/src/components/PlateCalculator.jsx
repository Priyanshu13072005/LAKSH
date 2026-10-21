import React, { useState, useMemo } from 'react';
import { X, Calculator } from 'lucide-react';

const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS = {
  25: '#ef4444',   // red
  20: '#3b82f6',   // blue
  15: '#eab308',   // yellow
  10: '#22c55e',   // green
  5: '#f8fafc',    // white
  2.5: '#ef4444',  // red (small)
  1.25: '#94a3b8', // gray
};

function calculatePlates(targetWeight, barWeight = 20) {
  const perSide = (targetWeight - barWeight) / 2;
  if (perSide <= 0) return [];

  let remaining = perSide;
  const plates = [];

  for (const plate of STANDARD_PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  return plates;
}

export default function PlateCalculator({ isOpen, onClose }) {
  const [targetWeight, setTargetWeight] = useState(100);
  const [barWeight, setBarWeight] = useState(20);

  const plates = useMemo(
    () => calculatePlates(targetWeight, barWeight),
    [targetWeight, barWeight]
  );

  const achievedWeight = barWeight + plates.reduce((sum, p) => sum + p, 0) * 2;
  const maxPlateWidth = 56;
  const minPlateWidth = 20;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0d0e12] border border-red-500/20 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Plate Calculator</h3>
              <p className="text-xs text-zinc-400">Plates needed per side of the bar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4 py-5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Target Weight (kg)
            </label>
            <input
              type="number"
              step="0.5"
              min={barWeight}
              value={targetWeight}
              onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Bar Weight (kg)
            </label>
            <select
              value={barWeight}
              onChange={(e) => setBarWeight(parseFloat(e.target.value))}
              className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-red-500 transition-colors"
            >
              <option value={20}>20 kg (Standard)</option>
              <option value={15}>15 kg (Women's)</option>
              <option value={10}>10 kg (Training)</option>
              <option value={7}>7 kg (EZ Curl)</option>
              <option value={0}>0 kg (No bar)</option>
            </select>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 pb-4">
          {[60, 80, 100, 120, 140, 160, 180, 200].map((w) => (
            <button
              key={w}
              onClick={() => setTargetWeight(w)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                targetWeight === w
                  ? 'bg-red-600 text-white border-red-500 font-bold shadow-md shadow-red-600/30'
                  : 'bg-[#181920] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {w} kg
            </button>
          ))}
        </div>

        {/* Visual Bar */}
        <div className="py-4">
          <div className="flex items-center justify-center gap-0.5">
            {/* Left plates (reversed) */}
            <div className="flex items-center gap-0.5 flex-row-reverse">
              {plates.map((plate, i) => {
                const height = 24 + (plate / 25) * 48;
                const width = minPlateWidth + ((plate / 25) * (maxPlateWidth - minPlateWidth));
                return (
                  <div
                    key={`l-${i}`}
                    className="rounded-sm flex items-center justify-center text-[10px] font-bold transition-all"
                    style={{
                      backgroundColor: PLATE_COLORS[plate],
                      height: `${height}px`,
                      width: `${width}px`,
                      color: plate === 5 ? '#0f172a' : '#fff',
                      opacity: 0.9,
                    }}
                  >
                    {plate}
                  </div>
                );
              })}
            </div>

            {/* Bar */}
            <div className="h-3 bg-gradient-to-r from-zinc-500 via-zinc-400 to-zinc-500 rounded-full flex-shrink-0" style={{ width: '80px' }}>
              <div className="h-full flex items-center justify-center text-[8px] font-bold text-zinc-900">
                {barWeight}kg
              </div>
            </div>

            {/* Right plates */}
            <div className="flex items-center gap-0.5">
              {plates.map((plate, i) => {
                const height = 24 + (plate / 25) * 48;
                const width = minPlateWidth + ((plate / 25) * (maxPlateWidth - minPlateWidth));
                return (
                  <div
                    key={`r-${i}`}
                    className="rounded-sm flex items-center justify-center text-[10px] font-bold transition-all"
                    style={{
                      backgroundColor: PLATE_COLORS[plate],
                      height: `${height}px`,
                      width: `${width}px`,
                      color: plate === 5 ? '#0f172a' : '#fff',
                      opacity: 0.9,
                    }}
                  >
                    {plate}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Plate Breakdown */}
        <div className="bg-slate-900/60 rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Per Side Breakdown
            </span>
            <span className="text-sm font-bold text-white">
              Total: <span className="text-amber-400">{achievedWeight} kg</span>
            </span>
          </div>
          {plates.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-3">
              {targetWeight <= barWeight
                ? 'No plates needed — just the bar!'
                : 'Cannot reach this weight with standard plates'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Group plates by weight */}
              {Object.entries(
                plates.reduce((acc, p) => {
                  acc[p] = (acc[p] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
                .map(([weight, count]) => (
                  <div
                    key={weight}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5"
                  >
                    <div
                      className="w-5 h-5 rounded-sm"
                      style={{ backgroundColor: PLATE_COLORS[parseFloat(weight)] }}
                    />
                    <span className="text-sm font-bold text-white">
                      {count}× {weight} kg
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
