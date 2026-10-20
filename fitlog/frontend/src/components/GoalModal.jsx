import React, { useState, useEffect } from 'react';
import { X, Target, Droplets, Footprints, Check } from 'lucide-react';
import { goalsAPI } from '../services/api';

export default function GoalModal({ isOpen, onClose, onGoalUpdated }) {
  const [stepGoal, setStepGoal] = useState(10000);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      goalsAPI.getGoals().then((res) => {
        if (res.data) {
          setStepGoal(res.data.daily_step_goal || 10000);
          setWaterGoal(res.data.daily_water_goal_ml || 2500);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await goalsAPI.updateGoals({
        daily_step_goal: Number(stepGoal),
        daily_water_goal_ml: Number(waterGoal),
      });
      setSuccess(true);
      if (onGoalUpdated) onGoalUpdated();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update goals:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-[#08080a] border border-white/15 p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Daily Fitness Goals</h3>
              <p className="text-xs text-zinc-400">Personalize your activity targets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              <Footprints className="w-4 h-4 text-red-400" />
              Daily Step Goal
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="500"
                value={stepGoal}
                onChange={(e) => setStepGoal(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-bold"
                required
              />
              <span className="absolute right-4 top-2.5 text-xs text-zinc-400">steps / day</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[8000, 10000, 12000, 15000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStepGoal(val)}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-colors ${
                    stepGoal === val
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              Daily Water Goal
            </label>
            <div className="relative">
              <input
                type="number"
                min="500"
                step="250"
                value={waterGoal}
                onChange={(e) => setWaterGoal(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-bold"
                required
              />
              <span className="absolute right-4 top-2.5 text-xs text-zinc-400">ml / day</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[2000, 2500, 3000, 3500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWaterGoal(val)}
                  className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-colors ${
                    waterGoal === val
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {(val / 1000).toFixed(1)}L
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 hover:scale-[1.02]"
            >
              {success ? (
                <>
                  <Check className="w-4 h-4 font-bold" /> Saved!
                </>
              ) : loading ? (
                'Saving...'
              ) : (
                'Save Goals'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
