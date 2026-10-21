import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Timer, 
  Dumbbell, 
  Layers, 
  Award, 
  Calendar 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { analyticsAPI } from '../services/api';
import MetricCard from '../components/MetricCard';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.getWorkoutAnalytics()
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatSeconds = (sec) => {
    if (!sec) return '0m';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Workout Analytics & Training Volume
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          In-depth metrics on total tonnage lifted, workout frequency, and training consistency.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Workouts"
          value={data?.total_workouts || 0}
          unit="sessions"
          subtitle="All completed workouts"
          icon={Dumbbell}
          color="red"
        />
        <MetricCard
          title="Total Gym Time"
          value={formatSeconds(data?.total_duration_seconds)}
          subtitle={`Avg ${formatSeconds(data?.avg_duration_seconds)} / session`}
          icon={Timer}
          color="white"
        />
        <MetricCard
          title="Total Weight Moved"
          value={(data?.total_volume || 0).toLocaleString()}
          unit="kg"
          subtitle="Cumulative training volume"
          icon={TrendingUp}
          color="red"
        />
        <MetricCard
          title="Total Completed Sets"
          value={(data?.total_sets || 0).toLocaleString()}
          unit="sets"
          subtitle={`${(data?.total_reps || 0).toLocaleString()} total reps`}
          icon={Layers}
          color="white"
        />
      </div>

      {/* Volume by Session Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Volume Progression by Session</h3>
            <p className="text-xs text-zinc-400">Total weight lifted (kg) across recent workouts</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-600/10 text-red-400 border border-red-500/20">
            Training Load
          </span>
        </div>

        {(!data?.volume_by_session || data.volume_by_session.length === 0) ? (
          <p className="text-xs text-zinc-500 text-center py-12">
            Complete workouts to generate your volume progression curve!
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.volume_by_session}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} unit="kg" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#08080a',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val.toLocaleString()} kg`, 'Volume']}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Workouts per Week Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Weekly Consistency</h3>
            <p className="text-xs text-zinc-400">Completed workouts per week</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-600/10 text-red-400 border border-red-500/20">
            Past 8 Weeks
          </span>
        </div>

        {(!data?.workouts_by_week || data.workouts_by_week.length === 0) ? (
          <p className="text-xs text-zinc-500 text-center py-12">No weekly workout data yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.workouts_by_week}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="week" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#08080a',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val} sessions`, 'Workouts']}
                />
                <Bar dataKey="workouts" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
