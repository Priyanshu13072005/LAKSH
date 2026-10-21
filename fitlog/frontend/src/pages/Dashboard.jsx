import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Timer, 
  Flame, 
  Droplets, 
  Footprints, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Trophy,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, workoutAPI, hydrationAPI, activityAPI } from '../services/api';
import MetricCard from '../components/MetricCard';
import { getLocalDateStr, getLocalTimeStr, buildLocalDateTimeStr } from '../utils/dateUtils';

export default function Dashboard({ onOpenGoalModal }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [quickWaterLoading, setQuickWaterLoading] = useState(false);
  const [quickStepLoading, setQuickStepLoading] = useState(false);
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [personalRecords, setPersonalRecords] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const todayStr = getLocalDateStr();
      const [dashRes, prRes] = await Promise.all([
        analyticsAPI.getDashboard({ target_date: todayStr }),
        analyticsAPI.getPersonalRecords().catch(() => ({ data: [] })),
      ]);
      setData(dashRes.data);
      setPersonalRecords(prRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleStartWorkout = async () => {
    if (data?.has_active_workout) {
      navigate('/workouts/active');
      return;
    }
    setCreatingWorkout(true);
    try {
      const todayStr = getLocalDateStr();
      await workoutAPI.createWorkout({
        title: `${user?.name || 'My'} Session`,
        workout_date: todayStr,
      });
      navigate('/workouts/active');
    } catch (err) {
      console.error('Failed to create workout:', err);
      if (err.response?.status === 409) {
        navigate('/workouts/active');
      }
    } finally {
      setCreatingWorkout(false);
    }
  };

  const handleQuickWater = async (amount) => {
    setQuickWaterLoading(true);
    setData((prev) => {
      if (!prev) return prev;
      const newWater = (prev.water_today_ml || 0) + amount;
      const target = prev.water_goal_ml || 2500;
      return {
        ...prev,
        water_today_ml: newWater,
        water_progress_pct: Math.min(100, Math.round((newWater / target) * 100)),
      };
    });

    try {
      const nowConsumed = buildLocalDateTimeStr(getLocalDateStr(), getLocalTimeStr());
      await hydrationAPI.addWaterIntake({ amount_ml: amount, consumed_at: nowConsumed });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to log water:', err);
      fetchDashboardData();
    } finally {
      setQuickWaterLoading(false);
    }
  };

  const handleQuickSteps = async (increment) => {
    setQuickStepLoading(true);
    const todayStr = getLocalDateStr();
    const current = data?.steps_today || 0;
    const newSteps = current + increment;

    setData((prev) => {
      if (!prev) return prev;
      const target = prev.step_goal || 10000;
      return {
        ...prev,
        steps_today: newSteps,
        step_progress_pct: Math.min(100, Math.round((newSteps / target) * 100)),
      };
    });

    try {
      await activityAPI.upsertDailyActivity(todayStr, { steps: newSteps });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update steps:', err);
      fetchDashboardData();
    } finally {
      setQuickStepLoading(false);
    }
  };

  const formatSeconds = (sec) => {
    if (!sec) return '0m';
    const mins = Math.floor(sec / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 text-sm font-semibold">Aggregating fitness metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-zinc-950 via-[#160a0d] to-[#08080a]">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {getGreeting()},{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-red-100 to-rose-400">
              {user?.name || 'Athlete'}
            </span>
            !
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base mt-1 max-w-xl font-medium">
            {data?.has_active_workout
              ? 'You have a workout session currently active. Keep the intensity high!'
              : `You have completed ${data?.workouts_this_week || 0} workouts this week. Ready to crush today's session?`}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={handleStartWorkout}
            disabled={creatingWorkout}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all duration-300 ${
              data?.has_active_workout
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/25 animate-pulse'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white hover:from-red-500 hover:to-rose-500 shadow-red-600/30 hover:scale-[1.02]'
            }`}
          >
            {data?.has_active_workout ? (
              <>
                <Timer className="w-4 h-4" />
                <span>Resume Active Session</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start New Workout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Duration"
          value={formatSeconds(data?.workout_duration_seconds)}
          subtitle={data?.total_exercises ? `${data.total_exercises} exercises logged` : 'No workout finished yet'}
          icon={Timer}
          color="red"
        />
        <MetricCard
          title="Sets / Reps"
          value={`${data?.total_sets || 0} / ${data?.total_reps || 0}`}
          subtitle="Completed reps today"
          icon={Layers}
          color="white"
        />
        <MetricCard
          title="Volume Lifted"
          value={(data?.total_volume || 0).toLocaleString()}
          unit="kg"
          subtitle="Weight × Repetitions"
          icon={Dumbbell}
          color="red"
        />
        <MetricCard
          title="Weekly Sessions"
          value={data?.workouts_this_week || 0}
          unit="sessions"
          subtitle="Since Monday"
          icon={TrendingUp}
          color="white"
        />
      </div>

      {/* Interactive Daily Trackers: Steps & Water */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Steps Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-b from-zinc-900/90 to-zinc-950/90">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/15 text-red-400">
                <Footprints className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Daily Steps</h3>
                <p className="text-xs text-zinc-400">
                  Target: {(data?.step_goal || 10000).toLocaleString()} steps
                </p>
              </div>
            </div>
            <Link
              to="/activity"
              className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-black text-white">
                {(data?.steps_today || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-red-400">
                {data?.step_progress_pct || 0}%
              </span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(data?.step_progress_pct || 0, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400 font-medium">Quick add:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickSteps(500)}
                disabled={quickStepLoading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-xs font-bold text-zinc-300 hover:text-red-400 border border-white/5 transition-all"
              >
                +500 steps
              </button>
              <button
                onClick={() => handleQuickSteps(1000)}
                disabled={quickStepLoading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-xs font-bold text-zinc-300 hover:text-red-400 border border-white/5 transition-all"
              >
                +1,000 steps
              </button>
            </div>
          </div>
        </div>

        {/* Hydration Card */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-b from-zinc-900/90 to-zinc-950/90">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/10 text-white">
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Water Intake</h3>
                <p className="text-xs text-zinc-400">
                  Target: {((data?.water_goal_ml || 2500) / 1000).toFixed(1)} Liters
                </p>
              </div>
            </div>
            <Link
              to="/hydration"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              Log Water <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="my-4">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-3xl font-black text-white">
                  {(data?.water_today_ml || 0).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-zinc-400 ml-1">ml</span>
              </div>
              <span className="text-xs font-bold text-cyan-400">
                {data?.water_progress_pct || 0}%
              </span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-3 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(data?.water_progress_pct || 0, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400 font-medium">Quick Drink:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickWater(250)}
                disabled={quickWaterLoading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-xs font-bold text-zinc-300 hover:text-cyan-400 border border-white/5 transition-all"
              >
                +250 ml (Glass)
              </button>
              <button
                onClick={() => handleQuickWater(500)}
                disabled={quickWaterLoading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-xs font-bold text-zinc-300 hover:text-cyan-400 border border-white/5 transition-all"
              >
                +500 ml (Bottle)
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Workout Duration Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-white text-base">Weekly Workout Time</h3>
              <p className="text-xs text-zinc-400">Duration in minutes per day</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.weekly_workout_durations || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  unit="m"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0c0c10', 
                    borderColor: '#27272a', 
                    borderRadius: '0.75rem', 
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  cursor={{ fill: 'rgba(239, 68, 68, 0.08)' }}
                  formatter={(val) => [`${val} minutes`, 'Duration']}
                />
                <Bar 
                  dataKey="duration_minutes" 
                  fill="#ef4444" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Steps Chart */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-white text-base">Daily Steps Trend</h3>
              <p className="text-xs text-zinc-400">Steps walked over the past week</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Target: {(data?.step_goal || 10000).toLocaleString()}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.weekly_steps || []}>
                <defs>
                  <linearGradient id="stepGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0c0c10', 
                    borderColor: '#27272a', 
                    borderRadius: '0.75rem', 
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                  formatter={(val) => [`${val.toLocaleString()} steps`, 'Activity']}
                />
                <Area 
                  type="monotone" 
                  dataKey="steps" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#stepGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PERSONAL RECORDS (PR) SHOWCASE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {personalRecords.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-red-500/20 bg-gradient-to-r from-red-600/10 via-zinc-900/60 to-zinc-950/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  Personal Records (PRs)
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    Max Weights & Reps
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Direct personal records logged across your completed gym sessions.
                </p>
              </div>
            </div>

            <Link
              to="/records"
              className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
            >
              <span>Explore All PRs ({personalRecords.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {personalRecords.slice(0, 4).map((pr) => (
              <div
                key={pr.exercise_id}
                className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/5 hover:border-red-500/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-xs text-white group-hover:text-red-300 transition-colors truncate">
                    {pr.exercise_name}
                  </h4>
                  <span className="text-[10px] text-zinc-400 ml-1 shrink-0 font-medium">
                    {pr.muscle_group}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/15">
                    <span className="text-[9px] uppercase font-extrabold text-red-400 block">
                      Max Weight
                    </span>
                    <span className="text-sm font-black text-white">
                      {pr.max_weight_kg > 0 ? `${pr.max_weight_kg}` : '0'}<span className="text-[10px] font-normal text-zinc-400 ml-0.5">kg</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      × {pr.max_weight_reps} reps
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] uppercase font-extrabold text-zinc-300 block">
                      Max Reps
                    </span>
                    <span className="text-sm font-black text-white">
                      {pr.max_reps}<span className="text-[10px] font-normal text-zinc-400 ml-0.5">r</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      @ {pr.max_reps_weight_kg}kg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Workouts Log */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-extrabold text-white text-base">Recent Workouts</h3>
            <p className="text-xs text-zinc-400">History of your latest gym sessions</p>
          </div>
          <Link
            to="/workouts"
            className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(!data?.recent_workouts || data.recent_workouts.length === 0) ? (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
            <Dumbbell className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-bold text-sm">No workout sessions recorded yet.</p>
            <p className="text-zinc-600 text-xs mt-1">Hit "Start New Workout" to record your sets and reps!</p>
          </div>
        ) : (
          <>
            {/* Mobile cards view */}
            <div className="md:hidden space-y-3">
              {data.recent_workouts.map((w) => (
                <Link
                  key={w.id}
                  to={w.status === 'IN_PROGRESS' ? '/workouts/active' : '/workouts'}
                  className="block p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-red-500/20 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{w.title}</h4>
                      <span className="text-[11px] text-zinc-500">{w.workout_date}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                      w.status === 'COMPLETED'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {w.status === 'IN_PROGRESS' ? 'Active' : 'Done'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Duration</span>
                      <span className="text-xs font-bold text-zinc-200">{formatSeconds(w.duration_seconds)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Exercises</span>
                      <span className="text-xs font-bold text-zinc-200">{w.exercises_count}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Volume</span>
                      <span className="text-xs font-black text-red-400">{w.total_volume.toLocaleString()} kg</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Exercises</th>
                    <th className="py-3 px-4">Total Volume</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {data.recent_workouts.map((w) => (
                    <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {w.title}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-xs">
                        {w.workout_date}
                      </td>
                      <td className="py-3 px-4 text-zinc-300 font-mono text-xs">
                        {formatSeconds(w.duration_seconds)}
                      </td>
                      <td className="py-3 px-4 text-zinc-300 text-xs font-medium">
                        {w.exercises_count} exercises ({w.total_sets} sets)
                      </td>
                      <td className="py-3 px-4 font-black text-red-400">
                        {w.total_volume.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          w.status === 'COMPLETED'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={w.status === 'IN_PROGRESS' ? '/workouts/active' : '/workouts'}
                          className="text-xs font-bold text-white px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        >
                          {w.status === 'IN_PROGRESS' ? 'Resume' : 'View'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
