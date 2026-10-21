import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  Dumbbell,
  Trash2,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Clock,
  Search,
  Filter,
  Flame,
  Zap,
  BookOpen
} from 'lucide-react';
import { templateAPI, exerciseAPI } from '../services/api';

const THEME_COLORS = {
  red: {
    id: 'red',
    name: 'Crimson',
    hex: '#ef4444',
    bg: 'bg-red-600/10',
    cardBorder: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/10',
    badge: 'bg-red-600/15 text-red-300 border-red-500/25',
  },
  emerald: {
    id: 'emerald',
    name: 'Crimson',
    hex: '#ef4444',
    bg: 'bg-red-600/10',
    cardBorder: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/10',
    badge: 'bg-red-600/15 text-red-300 border-red-500/25',
  },
  blue: {
    id: 'blue',
    name: 'Sapphire',
    hex: '#3b82f6',
    bg: 'bg-blue-500/10',
    cardBorder: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/10',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  },
  purple: {
    id: 'purple',
    name: 'Amethyst',
    hex: '#a855f7',
    bg: 'bg-purple-500/10',
    cardBorder: 'border-purple-500/30',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/10',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    hex: '#f59e0b',
    bg: 'bg-amber-500/10',
    cardBorder: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/10',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  },
  rose: {
    id: 'rose',
    name: 'Ruby',
    hex: '#f43f5e',
    bg: 'bg-rose-500/10',
    cardBorder: 'border-rose-500/30',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/10',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    hex: '#06b6d4',
    bg: 'bg-cyan-500/10',
    cardBorder: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/10',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  },
};

const MUSCLE_TABS = ['All', 'Chest', 'Back', 'Quadriceps', 'Shoulders', 'Biceps', 'Triceps', 'Abs'];

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [templateDetails, setTemplateDetails] = useState({});
  const [starting, setStarting] = useState(null);
  const [installingStarter, setInstallingStarter] = useState(false);
  const [routineSearch, setRoutineSearch] = useState('');

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('red');
  const [formExercises, setFormExercises] = useState([]);
  
  // Exercise picker inside modal
  const [pickerMuscle, setPickerMuscle] = useState('All');
  const [pickerSearch, setPickerSearch] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await templateAPI.listTemplates();
      setTemplates(res.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async () => {
    try {
      const res = await exerciseAPI.listExercises();
      setAllExercises(res.data || []);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchExercises();
  }, []);

  const fetchTemplateDetails = async (id) => {
    try {
      const res = await templateAPI.getTemplate(id);
      setTemplateDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch (err) {
      console.error('Failed to load template details:', err);
    }
  };

  const handleToggleExpand = (id) => {
    if (expandedTemplate === id) {
      setExpandedTemplate(null);
    } else {
      setExpandedTemplate(id);
      if (!templateDetails[id]) {
        fetchTemplateDetails(id);
      }
    }
  };

  const handleCreateTemplate = async () => {
    if (!formName.trim()) return;
    try {
      await templateAPI.createTemplate({
        name: formName.trim(),
        description: formDescription.trim() || null,
        color: formColor,
        icon: 'dumbbell',
        exercises: formExercises.map((ex, idx) => ({
          exercise_id: ex.id,
          order_index: idx + 1,
          default_sets: Number(ex.default_sets) || 3,
          default_reps: Number(ex.default_reps) || 10,
          default_weight_kg: ex.default_weight_kg ? Number(ex.default_weight_kg) : null,
          rest_seconds: Number(ex.rest_seconds) || 90,
        })),
      });
      setShowCreateModal(false);
      resetForm();
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to create template:', err);
      alert(err.response?.data?.detail || 'Failed to create routine.');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this workout routine permanently?')) return;
    try {
      await templateAPI.deleteTemplate(id);
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleStartFromTemplate = async (id) => {
    setStarting(id);
    try {
      await templateAPI.startWorkout(id);
      navigate('/workouts/active');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to start workout';
      alert(msg);
    } finally {
      setStarting(null);
    }
  };

  // 1-Click Starter Routine Generator
  const handleInstallStarterRoutine = async (splitType) => {
    if (allExercises.length === 0) return;
    setInstallingStarter(true);
    try {
      let title = '';
      let desc = '';
      let color = 'red';
      let exerciseNames = [];

      if (splitType === 'push') {
        title = 'Push Day (Chest, Shoulders & Triceps)';
        desc = 'Heavy compound bench pressing paired with shoulder and tricep isolation.';
        color = 'red';
        exerciseNames = ['Barbell Bench Press', 'Incline Dumbbell Press', 'Overhead Barbell Press', 'Triceps Rope Pushdown'];
      } else if (splitType === 'pull') {
        title = 'Pull Day (Back, Biceps & Rear Delts)';
        desc = 'Complete back builder with deadlifts, vertical pulls, and bicep volume.';
        color = 'blue';
        exerciseNames = ['Conventional Deadlift', 'Lat Pulldown', 'Barbell Bent-Over Row', 'Dumbbell Bicep Curl'];
      } else if (splitType === 'legs') {
        title = 'Leg Day (Quads, Hamstrings & Glutes)';
        desc = 'High-output leg strength session with squats, leg press, and posterior chain work.';
        color = 'amber';
        exerciseNames = ['Barbell Back Squat', 'Leg Press', 'Romanian Deadlift', 'Calf Raise'];
      } else {
        title = 'Upper Body Power';
        desc = 'Balanced full upper body session hitting chest, back, shoulders, and arms.';
        color = 'purple';
        exerciseNames = ['Barbell Bench Press', 'Lat Pulldown', 'Overhead Barbell Press', 'Dumbbell Bicep Curl'];
      }

      // Match exercises by name or fallback to first available
      const selected = exerciseNames.map((name, idx) => {
        const found = allExercises.find((e) => e.name.toLowerCase().includes(name.toLowerCase()));
        const fallback = allExercises[idx % allExercises.length];
        const ex = found || fallback;
        return {
          exercise_id: ex.id,
          order_index: idx + 1,
          default_sets: 3,
          default_reps: idx === 0 ? 8 : 10,
          default_weight_kg: ex.uses_external_weight ? (idx === 0 ? 60 : 20) : null,
          rest_seconds: 90,
        };
      });

      await templateAPI.createTemplate({
        name: title,
        description: desc,
        color,
        icon: 'dumbbell',
        exercises: selected,
      });

      await fetchTemplates();
    } catch (err) {
      console.error('Failed to install starter routine:', err);
    } finally {
      setInstallingStarter(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('red');
    setFormExercises([]);
    setIsPickerOpen(false);
    setPickerSearch('');
    setPickerMuscle('All');
  };

  const addExerciseToForm = (exercise) => {
    // Avoid exact duplicate in form
    if (formExercises.some((ex) => ex.id === exercise.id)) return;
    setFormExercises((prev) => [
      ...prev,
      {
        ...exercise,
        default_sets: 3,
        default_reps: 10,
        default_weight_kg: exercise.uses_external_weight ? 40 : null,
        rest_seconds: 90,
      },
    ]);
  };

  const removeExerciseFromForm = (index) => {
    setFormExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFormExercise = (index, field, value) => {
    setFormExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  // Filtered picker exercises
  const filteredPickerExercises = useMemo(() => {
    return allExercises.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchesMuscle = pickerMuscle === 'All' || ex.muscle_group.toLowerCase().includes(pickerMuscle.toLowerCase());
      return matchesSearch && matchesMuscle;
    });
  }, [allExercises, pickerSearch, pickerMuscle]);

  // Filtered routines list
  const filteredTemplates = useMemo(() => {
    if (!routineSearch.trim()) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(routineSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(routineSearch.toLowerCase()))
    );
  }, [templates, routineSearch]);

  const totalExercisesCount = templates.reduce((acc, t) => acc + (t.exercise_count || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-red-600/20 to-rose-600/10 border border-red-500/30 text-red-400 shadow-lg shadow-red-500/10">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Workout Routines & Splits
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Build your customized training splits and launch live sessions with 1 click.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm shadow-lg shadow-red-600/25 transition-all hover:scale-[1.02] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 font-bold" />
          Create Routine
        </button>
      </div>

      {/* Top Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0d0e12]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
              Saved Routines
            </span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-white">{templates.length}</span>
            <p className="text-xs text-zinc-400 mt-0.5">Active workout blueprints</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-600/10 via-zinc-900/60 to-black/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">
              Movements Seeded
            </span>
            <Dumbbell className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-white">{totalExercisesCount}</span>
            <p className="text-xs text-zinc-400 mt-0.5">Configured sets & reps across routines</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-[#0d0e12]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
              Exercise Library
            </span>
            <BookOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-white">{allExercises.length}</span>
            <p className="text-xs text-zinc-400 mt-0.5">Compound & isolation movements</p>
          </div>
        </div>
      </div>

      {/* Starter Routines Recommendation Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0d0e12] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-400" />
              1-Click Starter Routines
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Add standard science-backed splits directly to your account with pre-set exercises.
            </p>
          </div>
          {installingStarter && (
            <span className="text-xs text-red-400 animate-pulse font-semibold">
              Setting up routine...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            disabled={installingStarter}
            onClick={() => handleInstallStarterRoutine('push')}
            className="p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-300">Push Day</span>
              <Plus className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-90 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Chest • Delts • Triceps</p>
          </button>

          <button
            type="button"
            disabled={installingStarter}
            onClick={() => handleInstallStarterRoutine('pull')}
            className="p-3.5 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-300">Pull Day</span>
              <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-90 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Deadlifts • Lats • Biceps</p>
          </button>

          <button
            type="button"
            disabled={installingStarter}
            onClick={() => handleInstallStarterRoutine('legs')}
            className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-300">Leg Day</span>
              <Plus className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-90 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Squats • Quads • Hamstrings</p>
          </button>

          <button
            type="button"
            disabled={installingStarter}
            onClick={() => handleInstallStarterRoutine('upper')}
            className="p-3.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-left transition-all hover:scale-[1.02] group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-300">Upper Body</span>
              <Plus className="w-3.5 h-3.5 text-purple-400 group-hover:rotate-90 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">Complete Upper Torso</p>
          </button>
        </div>
      </div>

      {/* Search Bar for routines if more than 2 */}
      {templates.length > 2 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved routines by title or description..."
            value={routineSearch}
            onChange={(e) => setRoutineSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-dashed border-white/10 text-center space-y-4 bg-[#0d0e12]">
          <div className="w-16 h-16 rounded-2xl bg-red-600/15 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">No Custom Routines Yet</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Create your own routine from scratch, or click any of the 1-click starter templates above to immediately populate your workout library.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm shadow-lg shadow-red-600/25 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Create First Routine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tmpl) => {
            const colorCfg = THEME_COLORS[tmpl.color] || THEME_COLORS.red;
            const isExpanded = expandedTemplate === tmpl.id;
            const details = templateDetails[tmpl.id];

            return (
              <div
                key={tmpl.id}
                className={`glass-panel rounded-3xl border border-white/10 bg-[#0d0e12] overflow-hidden transition-all shadow-xl hover:border-white/20 ${colorCfg.glow}`}
              >
                {/* Header */}
                <div className="p-5 flex items-start justify-between gap-3">
                  <div
                    className="flex items-start gap-3 flex-1 cursor-pointer"
                    onClick={() => handleToggleExpand(tmpl.id)}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-md"
                      style={{ backgroundColor: `${colorCfg.hex}22`, color: colorCfg.hex }}
                    >
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-white text-base sm:text-lg">
                          {tmpl.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${colorCfg.badge}`}>
                          {tmpl.exercise_count} {tmpl.exercise_count === 1 ? 'Exercise' : 'Exercises'}
                        </span>
                        {tmpl.description && (
                          <span className="text-zinc-400 truncate max-w-[220px]">
                            {tmpl.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartFromTemplate(tmpl.id)}
                      disabled={starting === tmpl.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-md shadow-red-600/20 transition-all hover:scale-[1.02]"
                    >
                      {starting === tmpl.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>Start</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-600/10 border border-transparent hover:border-red-500/20 transition-colors"
                      title="Delete routine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleExpand(tmpl.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-black/40 space-y-2.5">
                    {!details ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-6 h-6 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                      </div>
                    ) : details.exercises?.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-3">No exercises assigned to this routine.</p>
                    ) : (
                      details.exercises?.map((ex, idx) => (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-white/5 text-zinc-300 flex items-center justify-center text-xs font-bold border border-white/5">
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-xs sm:text-sm font-bold text-white block">
                                {ex.exercise_name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {ex.muscle_group} • {ex.equipment}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-zinc-200">
                              {ex.default_sets} sets × {ex.default_reps} reps
                            </span>
                            {ex.default_weight_kg > 0 && (
                              <span className="text-[11px] text-red-300 font-semibold ml-1.5">
                                @ {ex.default_weight_kg}kg
                              </span>
                            )}
                            <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                              {ex.rest_seconds}s rest
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CREATE WORKOUT ROUTINE MODAL (PREMIUM REDESIGNED) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#0d0e12] border border-white/15 p-6 sm:p-7 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 shadow-md"
                  style={{ backgroundColor: `${THEME_COLORS[formColor]?.hex}25`, color: THEME_COLORS[formColor]?.hex }}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Create Workout Routine
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Define routine details, working sets, and exercise order.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              
              {/* Routine Name & Description */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5 block">
                    Routine Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Push Day (Chest & Triceps), Legs Heavy..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-white/15 px-4 py-3 text-sm text-white placeholder-zinc-500 font-semibold focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5 block">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Focus on progressive overload on bench press..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-900 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Vibrant Color Swatches */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-2 block">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-3">
                  {Object.entries(THEME_COLORS).map(([key, cfg]) => {
                    const isSelected = formColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormColor(key)}
                        className={`w-9 h-9 rounded-2xl transition-all flex items-center justify-center relative ${
                          isSelected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0d0e12]' : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: cfg.hex }}
                        title={cfg.name}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white font-black stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exercises Section */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block">
                      Routine Movements ({formExercises.length})
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Configure order, working sets, target reps, and rest timers.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 py-1.5 px-3.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 transition-all shadow-sm shadow-red-500/10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isPickerOpen ? 'Hide Picker' : 'Add Movement'}</span>
                  </button>
                </div>

                {/* Inline Exercise Picker Drawer */}
                {isPickerOpen && (
                  <div className="p-4 rounded-3xl bg-zinc-900 border border-white/15 space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search exercises by name..."
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          className="w-full bg-[#08080a] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    {/* Muscle Category Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {MUSCLE_TABS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPickerMuscle(m)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                            pickerMuscle === m
                              ? 'bg-red-600 text-white'
                              : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {/* Filtered Exercise Grid */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredPickerExercises.map((ex) => {
                        const isAlreadyAdded = formExercises.some((e) => e.id === ex.id);
                        return (
                          <div
                            key={ex.id}
                            onClick={() => !isAlreadyAdded && addExerciseToForm(ex)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                              isAlreadyAdded
                                ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                                : 'bg-black/60 hover:bg-red-600/10 border-white/5 hover:border-red-500/30 cursor-pointer text-white'
                            }`}
                          >
                            <div>
                              <span className="font-bold">{ex.name}</span>
                              <span className="text-[10px] text-zinc-400 ml-2">({ex.muscle_group})</span>
                            </div>
                            <span className="text-[11px] font-bold text-red-400">
                              {isAlreadyAdded ? 'Added' : '+ Add'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty exercises placeholder */}
                {formExercises.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-3xl bg-zinc-900/40 border border-dashed border-white/10 space-y-2">
                    <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400 font-semibold">
                      No exercises added to this routine yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="text-xs font-bold text-red-400 hover:underline"
                    >
                      Click here to pick movements from the library
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formExercises.map((ex, idx) => (
                      <div
                        key={`${ex.id}-${idx}`}
                        className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-red-600/15 text-red-400 border border-red-500/25 flex items-center justify-center text-xs font-black">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-black text-white">{ex.name}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              ({ex.muscle_group})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExerciseFromForm(idx)}
                            className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-1">
                          <div>
                            <label className="text-[9px] font-extrabold uppercase text-zinc-400 block mb-1">
                              Sets
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={ex.default_sets}
                              onChange={(e) => updateFormExercise(idx, 'default_sets', parseInt(e.target.value) || 1)}
                              className="w-full rounded-xl bg-[#08080a] border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white text-center focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-extrabold uppercase text-zinc-400 block mb-1">
                              Target Reps
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={ex.default_reps}
                              onChange={(e) => updateFormExercise(idx, 'default_reps', parseInt(e.target.value) || 1)}
                              className="w-full rounded-xl bg-[#08080a] border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white text-center focus:outline-none focus:border-red-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-extrabold uppercase text-zinc-400 block mb-1">
                              Weight (kg)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={ex.default_weight_kg ?? ''}
                              onChange={(e) => updateFormExercise(idx, 'default_weight_kg', parseFloat(e.target.value) || null)}
                              className="w-full rounded-xl bg-[#08080a] border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white text-center focus:outline-none focus:border-red-500"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-extrabold uppercase text-zinc-400 block mb-1">
                              Rest (sec)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="15"
                              value={ex.rest_seconds}
                              onChange={(e) => updateFormExercise(idx, 'rest_seconds', parseInt(e.target.value) || 90)}
                              className="w-full rounded-xl bg-[#08080a] border border-white/10 px-2.5 py-1.5 text-xs font-bold text-white text-center focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-5 py-2.5 rounded-xl text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTemplate}
                disabled={!formName.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 font-bold" />
                <span>Save Routine</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
