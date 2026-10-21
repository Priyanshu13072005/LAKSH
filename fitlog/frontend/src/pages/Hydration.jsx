import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Target, 
  Coffee, 
  CupSoda, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { hydrationAPI } from '../services/api';
import { 
  getLocalDateStr, 
  getLocalTimeStr, 
  buildLocalDateTimeStr, 
  formatDisplayTime, 
  formatDisplayDate 
} from '../utils/dateUtils';

export default function Hydration() {
  const todayStr = getLocalDateStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Custom entry state
  const [customAmount, setCustomAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayStr);
  const [entryTime, setEntryTime] = useState(getLocalTimeStr());
  const [entryNote, setEntryNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchHydration = async (dateToFetch = selectedDate) => {
    try {
      const res = await hydrationAPI.getDailyHydration(dateToFetch);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load hydration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHydration(selectedDate);
    setEntryDate(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateStr(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateStr(d));
  };

  const handleGoToday = () => {
    setSelectedDate(todayStr);
    setEntryTime(getLocalTimeStr());
  };

  const setRelativeTime = (minutesOffset) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesOffset);
    setEntryTime(getLocalTimeStr(d));
  };

  const handleAddIntake = async (amount, customConsumedAt = null, note = null) => {
    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) return;
    setSubmitting(true);
    try {
      const timestamp = customConsumedAt || buildLocalDateTimeStr(selectedDate, getLocalTimeStr());
      await hydrationAPI.addWaterIntake({ 
        amount_ml: amtNum,
        consumed_at: timestamp,
        note: note || undefined
      });
      setCustomAmount('');
      setEntryNote('');
      setEntryTime(getLocalTimeStr());
      fetchHydration(selectedDate);
    } catch (err) {
      console.error('Failed to log water:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = (e) => {
    if (e) e.preventDefault();
    if (!customAmount) return;
    const timestamp = buildLocalDateTimeStr(entryDate || selectedDate, entryTime || getLocalTimeStr());
    handleAddIntake(customAmount, timestamp, entryNote);
  };

  const handleDeleteIntake = async (id) => {
    try {
      await hydrationAPI.deleteWaterIntake(id);
      fetchHydration(selectedDate);
    } catch (err) {
      console.error('Failed to delete intake:', err);
    }
  };

  const quickPresets = [
    { label: 'Small Cup', amount: 150, icon: Coffee },
    { label: 'Standard Glass', amount: 250, icon: CupSoda },
    { label: 'Water Bottle', amount: 500, icon: Droplets },
    { label: 'Protein Shaker', amount: 750, icon: Droplets },
    { label: 'Large Jug', amount: 1000, icon: Droplets },
  ];

  const total = data?.total_ml || 0;
  const goal = data?.goal_ml || 2500;
  const progress = Math.min(data?.progress_pct || 0, 100);
  const isViewingToday = selectedDate === todayStr;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header and Date Selector Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Hydration Tracker</span>
            <Droplets className="w-6 h-6 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Log water intake with accurate time stamps and review daily hydration history.
          </p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 shadow-lg">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {!isViewingToday && (
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-bold text-xs hover:bg-cyan-500/30 transition-colors"
            >
              Today
            </button>
          )}

          <button
            onClick={handleNextDay}
            disabled={selectedDate >= todayStr}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Main Hydration Progress Hero */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-[#091a26] to-[#090d16] relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Droplets className="w-4 h-4" />
                  <span>{formatDisplayDate(selectedDate)} — Target: {(goal / 1000).toFixed(1)}L ({goal.toLocaleString()} ml)</span>
                </div>
                {isViewingToday && (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-500/30">
                    Live Today
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {total.toLocaleString()}
                  </span>
                  <span className="text-lg font-semibold text-slate-400">/ {goal.toLocaleString()} ml</span>
                </div>
                <p className="text-xs text-cyan-300 mt-1">
                  {progress >= 100 
                    ? '🎉 Daily hydration goal achieved!' 
                    : `${(goal - total).toLocaleString()} ml remaining for ${isViewingToday ? 'today' : 'this date'}`}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-400">
                  <span>0%</span>
                  <span className="text-cyan-400 font-bold">{progress}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Instant Quick Presets</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">(logs with current time)</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {quickPresets.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.amount}
                    onClick={() => handleAddIntake(p.amount)}
                    disabled={submitting}
                    className="glass-panel-interactive p-4 rounded-2xl border border-white/10 text-center flex flex-col items-center gap-2 group hover:border-cyan-500/40"
                  >
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white">+{p.amount} ml</span>
                    <span className="text-[10px] text-slate-400">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Custom Data Entry Card with Date & Time Selection */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-950/60 space-y-4">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm uppercase tracking-wide">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Custom Water Entry (Specify Exact Date & Time)</span>
            </div>

            <form onSubmit={handleCustomSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Amount */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Water Amount (ml) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    step="10"
                    required
                    placeholder="e.g. 350"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-500">
                    ml
                  </span>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Time */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Time
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEntryTime(getLocalTimeStr())}
                      className="text-[10px] text-cyan-400 hover:underline font-bold"
                    >
                      Now
                    </button>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={() => setRelativeTime(-30)}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 font-medium"
                    >
                      -30m
                    </button>
                    <span className="text-slate-600 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={() => setRelativeTime(-60)}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 font-medium"
                    >
                      -1h
                    </button>
                  </div>
                </div>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Note & Submit */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={submitting || !customAmount}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm transition-all duration-200 shrink-0 disabled:opacity-50 shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  {submitting ? 'Logging...' : 'Log'}
                </button>
              </div>
            </form>
          </div>

          {/* Intake Entries Log for Selected Date */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Logged Entries ({data?.entries?.length || 0})</span>
                <span className="text-xs font-semibold text-slate-400 font-normal">
                  — {formatDisplayDate(selectedDate)}
                </span>
              </h3>
            </div>

            {(!data?.entries || data.entries.length === 0) ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
                <Droplets className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">
                  No water recorded for {formatDisplayDate(selectedDate)}.
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Use the quick presets or custom form above to log your intake!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {data.entries.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between group hover:bg-white/[0.01] px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-extrabold text-sm text-white">
                            {item.amount_ml} ml
                          </span>
                          {item.note && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-medium border border-white/5">
                              {item.note}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{formatDisplayTime(item.consumed_at)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteIntake(item.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
