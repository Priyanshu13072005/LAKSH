import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Dumbbell, 
  Flame, 
  Search, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Layers, 
  Zap, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { analyticsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import OneRepMaxCalculator from '../components/OneRepMaxCalculator';

export default function PersonalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [sortBy, setSortBy] = useState('weight'); // 'weight' | 'reps' | '1rm' | 'name'

  const fetchPRs = async () => {
    try {
      const res = await analyticsAPI.getPersonalRecords();
      setRecords(res.data || []);
    } catch (err) {
      console.error('Failed to load personal records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  const muscleGroups = ['All', 'Chest', 'Back', 'Quadriceps', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Glutes', 'Calves'];

  const filtered = records
    .filter((r) => {
      const matchesSearch = r.exercise_name.toLowerCase().includes(search.toLowerCase());
      const matchesMuscle = selectedMuscle === 'All' || r.muscle_group.toLowerCase() === selectedMuscle.toLowerCase();
      return matchesSearch && matchesMuscle;
    })
    .sort((a, b) => {
      if (sortBy === 'weight') return b.max_weight_kg - a.max_weight_kg;
      if (sortBy === 'reps') return b.max_reps - a.max_reps;
      if (sortBy === '1rm') return b.best_estimated_1rm - a.best_estimated_1rm;
      return a.exercise_name.localeCompare(b.exercise_name);
    });

  // Highlight stats
  const totalExercisesWithPR = records.length;
  const heaviestLift = records.reduce((max, r) => (r.max_weight_kg > max.weight ? { name: r.exercise_name, weight: r.max_weight_kg, reps: r.max_weight_reps } : max), { name: 'None', weight: 0, reps: 0 });
  const highestReps = records.reduce((max, r) => (r.max_reps > max.reps ? { name: r.exercise_name, reps: r.max_reps, weight: r.max_reps_weight_kg } : max), { name: 'None', reps: 0, weight: 0 });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Personal Records (PRs)
              </h1>
              <p className="text-sm text-slate-400">
                Official lifetime maximum weights and max repetitions logged directly across your completed workouts.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/workouts"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-red-500/25 self-start sm:self-auto transition-all"
        >
          <Dumbbell className="w-4 h-4" />
          Log Next Workout
        </Link>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[#121318] to-[#08080a] relative overflow-hidden">
          <div className="absolute top-2 right-2 p-3 text-amber-500/15">
            <Trophy className="w-14 h-14" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            Heaviest Lift Ever
          </span>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-white">
              {heaviestLift.weight > 0 ? `${heaviestLift.weight} kg` : '—'}
            </h3>
            <p className="text-xs text-zinc-300 font-semibold mt-1">
              {heaviestLift.name}
            </p>
            {heaviestLift.weight > 0 && (
              <span className="text-[11px] text-zinc-400">
                Performed for {heaviestLift.reps} reps
              </span>
            )}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-600/10 via-[#121318] to-[#08080a] relative overflow-hidden">
          <div className="absolute top-2 right-2 p-3 text-red-500/15">
            <Flame className="w-14 h-14" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-red-400" />
            Highest Rep Set
          </span>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-white">
              {highestReps.reps > 0 ? `${highestReps.reps} reps` : '—'}
            </h3>
            <p className="text-xs text-zinc-300 font-semibold mt-1">
              {highestReps.name}
            </p>
            {highestReps.reps > 0 && (
              <span className="text-[11px] text-zinc-400">
                With {highestReps.weight} kg load
              </span>
            )}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-[#121318] to-[#08080a] relative overflow-hidden">
          <div className="absolute top-2 right-2 p-3 text-white/10">
            <Award className="w-14 h-14" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-red-400" />
            Exercises Mastered
          </span>
          <div className="mt-3">
            <h3 className="text-3xl font-black text-white">
              {totalExercisesWithPR}
            </h3>
            <p className="text-xs text-zinc-300 font-semibold mt-1">
              Distinct Movements Recorded
            </p>
            <span className="text-[11px] text-zinc-400">
              Each tracked with max load & volume
            </span>
          </div>
        </div>
      </div>

      {/* Interactive 1RM & Percentage Target Calculator */}
      <OneRepMaxCalculator exercisePRs={records} />

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search exercise PRs (e.g. Bench Press, Squat, Lat Pulldown)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="weight">Max Weight (Highest First)</option>
              <option value="reps">Max Repetitions</option>
              <option value="1rm">Estimated 1RM</option>
              <option value="name">Exercise Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Muscle group badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            Muscle:
          </span>
          {muscleGroups.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(m)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                selectedMuscle.toLowerCase() === m.toLowerCase()
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* PR Cards Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border border-dashed border-slate-800 text-center space-y-4">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">No Personal Records Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Complete workout sessions with sets and repetitions to automatically generate your official exercise PR records here!
            </p>
          </div>
          <Link
            to="/workouts"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-xs shadow-lg shadow-red-500/25 hover:brightness-110"
          >
            <Dumbbell className="w-4 h-4" />
            Go to Workouts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((pr) => (
            <div
              key={pr.exercise_id}
              className="glass-panel-interactive p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-red-500/40 transition-all group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-base group-hover:text-red-400 transition-colors">
                      {pr.exercise_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-600/10 text-red-400 border border-red-500/20">
                        {pr.muscle_group}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-400">
                        {pr.equipment}
                      </span>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Award className="w-4 h-4" />
                  </div>
                </div>

                {/* PR Records comparison cards */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {/* Maximum Weight PR */}
                  <div className="p-3 rounded-xl bg-[#121318] border border-amber-500/20 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                        Max Weight
                      </span>
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="mt-1">
                      <span className="text-xl font-black text-white">
                        {pr.max_weight_kg > 0 ? `${pr.max_weight_kg}` : '0'}
                        <span className="text-xs font-normal text-zinc-400 ml-1">kg</span>
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        × {pr.max_weight_reps} {pr.max_weight_reps === 1 ? 'rep' : 'reps'}
                      </p>
                      {pr.max_weight_date && (
                        <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {pr.max_weight_date}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Maximum Reps PR */}
                  <div className="p-3 rounded-xl bg-[#121318] border border-red-500/20 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">
                        Max Reps
                      </span>
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <div className="mt-1">
                      <span className="text-xl font-black text-white">
                        {pr.max_reps}
                        <span className="text-xs font-normal text-zinc-400 ml-1">reps</span>
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        @ {pr.max_reps_weight_kg} kg
                      </p>
                      {pr.max_reps_date && (
                        <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {pr.max_reps_date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Insight: Estimated 1RM & Session Count */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                  <div className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Est. 1RM</span>
                      <span className="text-xs font-extrabold text-white">
                        {pr.best_estimated_1rm > 0 ? `${pr.best_estimated_1rm} kg` : '—'}
                      </span>
                    </div>
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Sessions</span>
                      <span className="text-xs font-extrabold text-red-400">
                        {pr.total_sessions} logged
                      </span>
                    </div>
                    <Layers className="w-3.5 h-3.5 text-red-400" />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-white/5 mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {pr.uses_external_weight ? 'Weighted Movement' : 'Bodyweight Movement'}
                </span>
                <Link
                  to="/exercises"
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  Progression Chart <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
