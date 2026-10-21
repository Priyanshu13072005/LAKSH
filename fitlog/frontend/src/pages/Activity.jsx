import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Footprints, 
  Flame, 
  Compass, 
  Target, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Edit3,
  RefreshCw,
  Smartphone,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Unlink
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { activityAPI, goalsAPI } from '../services/api';
import { getLocalDateStr, formatDisplayDate } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Activity() {
  const [searchParams, setSearchParams] = useSearchParams();
  const todayStr = getLocalDateStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentSteps, setCurrentSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Google Fit / Health Connect integration state
  const [googleFitStatus, setGoogleFitStatus] = useState({
    is_connected: false,
    client_configured: false,
    auth_url: null,
  });
  const [syncingGoogleFit, setSyncingGoogleFit] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const fetchActivity = async (targetDate = selectedDate) => {
    try {
      const res = await activityAPI.getDailyActivity(targetDate);
      if (res.data) {
        setCurrentSteps(res.data.steps || 0);
        setInputVal(res.data.steps || 0);
      } else {
        setCurrentSteps(0);
        setInputVal(0);
      }
      const goalsRes = await goalsAPI.getGoals();
      if (goalsRes.data) {
        setStepGoal(goalsRes.data.daily_step_goal || 10000);
      }
      const histRes = await activityAPI.getHistory({ days: 14 });
      setHistory(histRes.data || []);

      const fitStatusRes = await activityAPI.getGoogleFitStatus();
      setGoogleFitStatus(fitStatusRes.data);
    } catch (err) {
      console.error('Failed to load steps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity(selectedDate);
  }, [selectedDate]);

  // Handle OAuth callback if redirected back from Google with ?code=...
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      const handleCallback = async () => {
        setSyncingGoogleFit(true);
        try {
          const res = await activityAPI.sendGoogleFitCallback(code);
          setSyncMessage({
            type: 'success',
            text: `Connected to Google Fit & Health Connect! Synced ${res.data.synced_steps?.toLocaleString() || 0} steps for today.`,
          });
          // Remove ?code= from URL cleanly
          searchParams.delete('code');
          searchParams.delete('scope');
          setSearchParams(searchParams, { replace: true });
          fetchActivity();
        } catch (err) {
          console.error('Failed to exchange Google OAuth code:', err);
          setSyncMessage({
            type: 'error',
            text: err.response?.data?.detail || 'Failed to authenticate with Google Fit.',
          });
        } finally {
          setSyncingGoogleFit(false);
        }
      };
      handleCallback();
    }
  }, [searchParams]);

  const handleManualSync = async () => {
    setSyncingGoogleFit(true);
    setSyncMessage(null);
    try {
      const res = await activityAPI.syncGoogleFitSteps(selectedDate);
      setSyncMessage({
        type: 'success',
        text: `Sync complete! Steps for ${selectedDate}: ${res.data.steps?.toLocaleString() || 0}`,
      });
      fetchActivity(selectedDate);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Sync failed. Please reconnect Google Fit.',
      });
    } finally {
      setSyncingGoogleFit(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Fit / Health Connect from LAKSH?')) return;
    try {
      await activityAPI.disconnectGoogleFit();
      setSyncMessage({ type: 'info', text: 'Disconnected from Google Fit.' });
      fetchActivity(selectedDate);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

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
  };

  const handleSaveSteps = async (val) => {
    setSubmitting(true);
    try {
      const num = Math.max(0, parseInt(val, 10) || 0);
      await activityAPI.upsertDailyActivity(selectedDate, { steps: num });
      setCurrentSteps(num);
      setIsEditing(false);
      fetchActivity(selectedDate);
    } catch (err) {
      console.error('Failed to save steps:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIncrement = (inc) => {
    const updated = currentSteps + inc;
    handleSaveSteps(updated);
  };

  // Estimates: ~0.762m per step, ~0.04 kcal per step
  const distanceKm = ((currentSteps * 0.762) / 1000).toFixed(2);
  const caloriesBurned = Math.round(currentSteps * 0.04);
  const progressPct = Math.min(Math.round((currentSteps / stepGoal) * 100), 100);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isViewingToday = selectedDate === todayStr;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header with Date Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Daily Step & Activity Tracker
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Automatic Android Health Connect sync & manual step tracking across phone and laptop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl border border-white/10 shadow-lg">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-red-400 shrink-0" />
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
                className="px-2.5 py-1 rounded-xl bg-red-500/20 text-red-300 font-bold text-xs hover:bg-red-500/30 transition-colors"
              >
                Today
              </button>
            )}

            <button
              onClick={handleNextDay}
              disabled={selectedDate >= todayStr}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Sync Button if connected */}
          {googleFitStatus.is_connected && (
            <button
              onClick={handleManualSync}
              disabled={syncingGoogleFit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 text-xs font-bold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogleFit ? 'animate-spin' : ''}`} />
              <span>{syncingGoogleFit ? 'Syncing...' : 'Sync Steps Now'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
          syncMessage.type === 'success'
            ? 'bg-red-600/10 border-red-500/30 text-red-300'
            : syncMessage.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-zinc-800 border-zinc-700 text-zinc-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {syncMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{syncMessage.text}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-zinc-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Google Fit / Health Connect Integration Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d0e12] via-[#14151b] to-[#08080a] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">
                  Automatic Android Step Sync
                </h3>
                {googleFitStatus.is_connected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/5">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-lg">
                Steps recorded on your Android phone via <strong>Health Connect</strong> or <strong>Google Fit</strong> are automatically synchronized to your LAKSH account in real-time, viewable on both mobile and laptop.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {googleFitStatus.is_connected ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={syncingGoogleFit}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-500/20 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogleFit ? 'animate-spin' : ''}`} />
                  {syncingGoogleFit ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                  title="Disconnect Google Fit"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            ) : googleFitStatus.client_configured && googleFitStatus.auth_url ? (
              <a
                href={googleFitStatus.auth_url}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Connect Google Fit
              </a>
            ) : (
              <div className="p-3 rounded-xl bg-[#121318] border border-white/5 text-[11px] text-zinc-400 max-w-xs">
                💡 Add <code>GOOGLE_CLIENT_ID</code> in <code>backend/.env</code> to activate 1-click Google OAuth auto-sync.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Steps Hero */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-red-500/20 bg-gradient-to-r from-[#0d0e12] via-[#150b0e] to-[#08080a] relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Footprints className="w-4 h-4" />
              <span>{formatDisplayDate(selectedDate)} — Target: {stepGoal.toLocaleString()} steps</span>
            </div>

            <div className="flex items-center gap-4">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="w-40 rounded-xl bg-[#14151b] border border-red-500 px-3 py-1.5 text-2xl font-black text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveSteps(inputVal)}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                    {currentSteps.toLocaleString()}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Edit Step Count"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-zinc-800 rounded-full h-3.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-semibold text-zinc-400">
                <span>0</span>
                <span className="text-red-400">{progressPct}%</span>
                <span>{stepGoal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Activity Estimates Cards */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#121318] border border-white/5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Est. Calories</span>
                <p className="text-lg font-black text-white">{caloriesBurned} kcal</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#121318] border border-white/5 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/5 text-zinc-300">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Est. Distance</span>
                <p className="text-lg font-black text-white">{distanceKm} km</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Increment Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
          Quick Adjust
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[500, 1000, 2500, 5000].map((step) => (
            <button
              key={step}
              onClick={() => handleIncrement(step)}
              disabled={submitting}
              className="glass-panel-interactive p-4 rounded-2xl border border-white/10 text-center flex flex-col items-center gap-1 group hover:border-red-500/40"
            >
              <div className="p-2 rounded-xl bg-red-600/10 text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Plus className="w-4 h-4 font-bold" />
              </div>
              <span className="text-sm font-bold text-white">+{step.toLocaleString()}</span>
              <span className="text-[10px] text-zinc-400">steps</span>
            </button>
          ))}
        </div>
      </div>

      {/* Steps History Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Step Activity History</h3>
            <p className="text-xs text-zinc-400">Daily walk totals over the last 14 days</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-600/10 text-red-400 border border-red-500/20">
            Target: {stepGoal.toLocaleString()}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-8">No step history recorded yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="activity_date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#08080a',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val.toLocaleString()} steps`, 'Steps']}
                />
                <Bar dataKey="steps" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
