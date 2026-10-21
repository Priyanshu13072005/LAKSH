import React, { useState, useMemo } from 'react';
import { Calculator, Zap, ChevronDown, ChevronUp, Scale, Sparkles, X } from 'lucide-react';

export default function OneRepMaxCalculator({ exercisePRs = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(5);
  const [selectedExerciseName, setSelectedExerciseName] = useState('');

  // Auto-fill from an existing PR
  const handleSelectPR = (e) => {
    const exName = e.target.value;
    setSelectedExerciseName(exName);
    if (!exName) return;
    const found = exercisePRs.find((pr) => pr.exercise_name === exName);
    if (found && found.max_weight_kg > 0) {
      setWeight(found.max_weight_kg);
      setReps(found.max_weight_reps || 1);
    }
  };

  // 1RM Formulas
  const { epley1RM, brzycki1RM, average1RM } = useMemo(() => {
    const w = Number(weight) || 0;
    const r = Math.max(1, Number(reps) || 1);
    if (w <= 0) return { epley1RM: 0, brzycki1RM: 0, average1RM: 0 };
    if (r === 1) return { epley1RM: w, brzycki1RM: w, average1RM: w };

    const epley = Math.round(w * (1 + r / 30) * 10) / 10;
    const brzycki = Math.round((w * (36 / (37 - Math.min(r, 36)))) * 10) / 10;
    const avg = Math.round(((epley + brzycki) / 2) * 10) / 10;
    return { epley1RM: epley, brzycki1RM: brzycki, average1RM: avg };
  }, [weight, reps]);

  // % of 1RM breakdown
  const percentages = [
    { pct: 100, reps: '1 rep', desc: 'True Max' },
    { pct: 95, reps: '2 reps', desc: 'Heavy Peak' },
    { pct: 90, reps: '3-4 reps', desc: 'Strength Peak' },
    { pct: 85, reps: '5-6 reps', desc: 'Strength Hypertrophy' },
    { pct: 80, reps: '7-8 reps', desc: 'Hypertrophy Ideal' },
    { pct: 75, reps: '9-10 reps', desc: 'Hypertrophy Volume' },
    { pct: 70, reps: '11-12 reps', desc: 'Endurance / Pump' },
    { pct: 65, reps: '15 reps', desc: 'Speed / Deload' },
    { pct: 60, reps: '20 reps', desc: 'Dynamic Warmup' },
  ];

  return (
    <div className="glass-panel rounded-3xl border border-red-500/25 bg-gradient-to-br from-red-950/20 via-[#121318] to-[#08080a] overflow-hidden shadow-xl transition-all">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Interactive 1RM & Training Load Calculator</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/30">
                Epley & Brzycki
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Calculate estimated 1-Rep Max and target working weights for any percentage from 60% to 100%.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {average1RM > 0 && !isOpen && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-500/30 text-xs">
              <span className="text-zinc-400">Est. 1RM:</span>
              <span className="font-extrabold text-red-400">{average1RM} kg</span>
            </div>
          )}
          <div className="p-2 rounded-xl bg-white/5 text-zinc-300">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-white/5 space-y-6">
          {/* Quick Select from Existing PRs */}
          {exercisePRs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span>Auto-fill from your tracked PRs:</span>
              </div>
              <select
                value={selectedExerciseName}
                onChange={handleSelectPR}
                className="bg-[#121318] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="">-- Choose an exercise --</option>
                {exercisePRs
                  .filter((p) => p.max_weight_kg > 0)
                  .map((p) => (
                    <option key={p.exercise_id} value={p.exercise_name}>
                      {p.exercise_name} ({p.max_weight_kg} kg × {p.max_weight_reps} reps)
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Lifted Weight (kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-[#121318] border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Repetitions Completed (1 - 15)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full bg-[#121318] border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="5"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
                  reps
                </span>
              </div>
            </div>
          </div>

          {/* Result Highlight Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-red-600/15 border border-red-500/30 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 block">
                Estimated 1-Rep Max
              </span>
              <div className="text-3xl font-black text-white mt-1">
                {average1RM} <span className="text-sm font-semibold text-red-400">kg</span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 block">
                Average of standard formulas
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121318] border border-white/10 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Epley Formula
              </span>
              <div className="text-2xl font-black text-zinc-200 mt-1">
                {epley1RM} <span className="text-xs font-semibold text-zinc-400">kg</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                w × (1 + r/30)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#121318] border border-white/10 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Brzycki Formula
              </span>
              <div className="text-2xl font-black text-zinc-200 mt-1">
                {brzycki1RM} <span className="text-xs font-semibold text-zinc-400">kg</span>
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                w × (36 / (37 - r))
              </span>
            </div>
          </div>

          {/* Percentage Target Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-red-400" />
              Working Weights by Intensity %
            </h4>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {percentages.map(({ pct, reps: repDesc, desc }) => {
                const targetWeight = Math.round((average1RM * (pct / 100)) * 2) / 2; // round to nearest 0.5kg
                return (
                  <div
                    key={pct}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      pct === 100
                        ? 'bg-red-600/20 border-red-500/40 text-red-300'
                        : pct >= 80
                        ? 'bg-[#121318] border-white/10 hover:border-red-500/30'
                        : 'bg-[#121318]/60 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <span className="text-[11px] font-black block text-red-400">
                      {pct}%
                    </span>
                    <div className="text-base font-extrabold text-white mt-0.5">
                      {targetWeight}
                      <span className="text-[10px] font-normal text-zinc-400 ml-0.5">kg</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block leading-tight font-medium">
                      {repDesc}
                    </span>
                    <span className="text-[9px] text-zinc-500 block truncate mt-0.5">
                      {desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
