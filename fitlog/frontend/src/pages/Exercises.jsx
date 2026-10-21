import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Dumbbell, 
  TrendingUp, 
  X, 
  Award, 
  Trash2, 
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { exerciseAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Exercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [progressionExercise, setProgressionExercise] = useState(null);
  const [progressionData, setProgressionData] = useState(null);
  const [progressionLoading, setProgressionLoading] = useState(false);

  // New Exercise Form
  const [newExercise, setNewExercise] = useState({
    name: '',
    muscle_group: 'Chest',
    equipment: 'Barbell',
    category: 'Strength',
    uses_external_weight: true,
    description: '',
    instructions: '',
  });

  const fetchExercises = async () => {
    try {
      const res = await exerciseAPI.listExercises();
      setExercises(res.data || []);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    try {
      await exerciseAPI.createExercise(newExercise);
      setShowCreateModal(false);
      setNewExercise({
        name: '',
        muscle_group: 'Chest',
        equipment: 'Barbell',
        category: 'Strength',
        uses_external_weight: true,
        description: '',
        instructions: '',
      });
      fetchExercises();
    } catch (err) {
      console.error('Failed to create exercise:', err);
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!window.confirm('Delete this custom exercise?')) return;
    try {
      await exerciseAPI.deleteExercise(id);
      fetchExercises();
    } catch (err) {
      console.error('Failed to delete exercise:', err);
    }
  };

  const handleViewProgression = async (ex) => {
    setProgressionExercise(ex);
    setProgressionLoading(true);
    try {
      const res = await analyticsAPI.getExerciseProgression(ex.id);
      setProgressionData(res.data);
    } catch (err) {
      console.error('Failed to fetch progression:', err);
      setProgressionData(null);
    } finally {
      setProgressionLoading(false);
    }
  };

  const muscleGroups = ['All', 'Chest', 'Back', 'Quadriceps', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps', 'Abs'];
  const equipmentOptions = ['All', 'Barbell', 'Dumbbells', 'Cable', 'Machine', 'Bodyweight'];

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = !selectedMuscle || selectedMuscle === 'All' || ex.muscle_group === selectedMuscle;
    const matchesEquip = !selectedEquipment || selectedEquipment === 'All' || ex.equipment === selectedEquipment;
    return matchesSearch && matchesMuscle && matchesEquip;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Exercise Catalog & Library
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse built-in movement guides, track personal records, or create custom exercises.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 font-bold" />
          Add Custom Exercise
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search exercises by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-[#121318] border border-zinc-800 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-zinc-400 mr-1">Muscle:</span>
          {muscleGroups.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(m === 'All' ? '' : m)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                (selectedMuscle === '' && m === 'All') || selectedMuscle === m
                  ? 'bg-red-600/20 border-red-500 text-red-400 font-bold'
                  : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((ex) => (
          <div
            key={ex.id}
            className="glass-panel-interactive p-5 rounded-2xl border border-white/10 flex flex-col justify-between group hover:border-red-500/40"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-base group-hover:text-red-400 transition-colors">
                    {ex.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-600/10 text-red-400 border border-red-500/20">
                      {ex.muscle_group}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-400">
                      {ex.equipment}
                    </span>
                  </div>
                </div>

                {ex.owner_user_id === user?.id && (
                  <button
                    onClick={() => handleDeleteExercise(ex.id)}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400"
                    title="Delete Custom Exercise"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {ex.description && (
                <p className="text-xs text-zinc-400 mt-3 line-clamp-2">
                  {ex.description}
                </p>
              )}

              {ex.instructions && (
                <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2 italic">
                  💡 {ex.instructions}
                </p>
              )}

              {/* Cumulative Exercise Stats: SETS / REPS & VOLUME LIFTED */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/5">
                <div className="rounded-xl bg-[#14151b] border border-white/5 p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Sets / Reps
                    </span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block">
                      {ex.total_sets || 0} / {ex.total_reps || 0}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5 text-zinc-300">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="rounded-xl bg-red-600/10 border border-red-500/20 p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Volume Lifted
                    </span>
                    <span className="text-sm font-extrabold text-white mt-0.5 block">
                      {(ex.total_volume || 0).toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">kg</span>
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-red-600/20 text-red-400">
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Personal Record (PR) Badge if achieved */}
              {(ex.personal_record_weight || ex.personal_record_reps) && (
                <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Workout PR:
                  </span>
                  <div className="flex items-center gap-2 text-[11px] font-extrabold">
                    {ex.personal_record_weight ? (
                      <span className="text-white">{ex.personal_record_weight} kg</span>
                    ) : null}
                    {ex.personal_record_reps ? (
                      <span className="text-red-400">({ex.personal_record_reps} reps)</span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                {ex.uses_external_weight ? 'Weighted' : 'Bodyweight'}
              </span>
              <button
                onClick={() => handleViewProgression(ex)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 transition-all"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Progression & PR
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Progression & PR Modal */}
      {progressionExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0d0e12] border border-red-500/20 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600/15 text-red-400 border border-red-500/30">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {progressionExercise.name}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {progressionExercise.muscle_group} • {progressionExercise.equipment}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProgressionExercise(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {progressionLoading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="py-4 space-y-6 overflow-y-auto">
                {/* PR Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#121318] border border-amber-500/20 flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-amber-500/15 text-amber-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400">Max Weight PR</span>
                      <h4 className="text-2xl font-black text-white">
                        {progressionData?.personal_record_weight ? `${progressionData.personal_record_weight} kg` : 'None'}
                      </h4>
                      {progressionData?.max_weight_reps && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          for {progressionData.max_weight_reps} reps {progressionData.max_weight_date && `• ${progressionData.max_weight_date}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#121318] border border-red-500/20 flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-red-600/15 text-red-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-400">Max Reps PR</span>
                      <h4 className="text-2xl font-black text-white">
                        {progressionData?.personal_record_reps ? `${progressionData.personal_record_reps} reps` : 'None'}
                      </h4>
                      {progressionData?.max_reps_weight !== undefined && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          @ {progressionData.max_reps_weight} kg {progressionData.max_reps_date && `• ${progressionData.max_reps_date}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {progressionData?.best_estimated_1rm > 0 && (
                  <div className="p-3 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-400">Brzycki Estimated 1-Rep Max (1RM)</span>
                      <p className="text-sm font-extrabold text-white mt-0.5">
                        {progressionData.best_estimated_1rm} kg
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">Calculated from peak set</span>
                  </div>
                )}

                {/* Progression Chart */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                    Max Weight Over Time
                  </h4>
                  {(!progressionData?.history || progressionData.history.length === 0) ? (
                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500">
                      No completed session logs with this exercise yet. Complete a workout to see progression charts!
                    </div>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressionData.history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                          <YAxis stroke="#71717a" fontSize={11} unit="kg" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#08080a',
                              borderColor: '#27272a',
                              borderRadius: '0.75rem',
                              color: '#fff',
                              fontSize: '12px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="max_weight"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ fill: '#ef4444', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0d0e12] border border-red-500/20 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Create Custom Exercise</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bulgarian Split Squat"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1">
                    Muscle Group
                  </label>
                  <select
                    value={newExercise.muscle_group}
                    onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
                    className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    {['Chest', 'Back', 'Quadriceps', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Glutes', 'Calves'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1">
                    Equipment
                  </label>
                  <select
                    value={newExercise.equipment}
                    onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
                    className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    {['Barbell', 'Dumbbells', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell'].map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1">
                  Instructions / Form Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Short cues on execution and setup..."
                  value={newExercise.instructions}
                  onChange={(e) => setNewExercise({ ...newExercise, instructions: e.target.value })}
                  className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:brightness-110"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
