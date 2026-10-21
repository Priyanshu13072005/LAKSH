import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Plus, 
  Calendar, 
  Timer, 
  Trash2, 
  Eye, 
  Edit2, 
  Check, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Clock,
  Layers,
  Activity,
  Filter,
  CheckCircle,
  Trophy,
  Award,
  Download
} from 'lucide-react';
import { workoutAPI, exerciseAPI, analyticsAPI } from '../services/api';
import { getLocalDateStr } from '../utils/dateUtils';

const PRESET_ACTIVITIES = [
  { name: 'Chest & Triceps', defaultMuscle: 'Chest' },
  { name: 'Back & Biceps', defaultMuscle: 'Back' },
  { name: 'Leg Day & Quads', defaultMuscle: 'Legs' },
  { name: 'Shoulders & Arms', defaultMuscle: 'Shoulders' },
  { name: 'Full Body Strength', defaultMuscle: 'All' },
  { name: 'Cardio & Abs', defaultMuscle: 'Abs' },
  { name: 'Push Day', defaultMuscle: 'Chest' },
  { name: 'Pull Day', defaultMuscle: 'Back' },
];

const PRESET_DURATIONS = [30, 45, 60, 75, 90];

const MUSCLE_TABS = [
  { id: 'All', label: 'All' },
  { id: 'Chest', label: 'Chest' },
  { id: 'Back', label: 'Back' },
  { id: 'Legs', label: 'Legs' },
  { id: 'Shoulders', label: 'Shoulders' },
  { id: 'Arms', label: 'Arms' },
  { id: 'Abs', label: 'Abs / Core' },
];

// Helper to filter exercises by muscle category
export const filterExercisesByMuscle = (exercises, muscle) => {
  if (!exercises || exercises.length === 0) return [];
  if (!muscle || muscle === 'All') return exercises;
  const target = muscle.toLowerCase();

  return exercises.filter((ex) => {
    const mg = (ex.muscle_group || '').toLowerCase();
    if (target === 'chest') return mg.includes('chest') || mg.includes('pectoral');
    if (target === 'back') return mg.includes('back') || mg.includes('lat') || mg.includes('traps');
    if (target === 'legs') return mg.includes('leg') || mg.includes('quad') || mg.includes('hamstring') || mg.includes('glute') || mg.includes('calf');
    if (target === 'shoulders') return mg.includes('shoulder') || mg.includes('delt');
    if (target === 'arms') return mg.includes('bicep') || mg.includes('tricep') || mg.includes('arm') || mg.includes('forearm');
    if (target === 'abs') return mg.includes('ab') || mg.includes('core');
    return mg.includes(target);
  });
};

export default function Workouts() {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);
  const [exercisesList, setExercisesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);

  // Modals & Drawers
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  // New Workout Form state
  const [newTitle, setNewTitle] = useState('Chest & Triceps');
  const [newDate, setNewDate] = useState(getLocalDateStr());
  const [newDurationMins, setNewDurationMins] = useState(45);
  const [newNotes, setNewNotes] = useState('');
  
  // New Workout Muscle Filter & Exercise Selector
  const [newSessionMuscle, setNewSessionMuscle] = useState('Chest');
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [exerciseSetsCount, setExerciseSetsCount] = useState(3);
  const [exerciseRepsCount, setExerciseRepsCount] = useState(10);
  const [exerciseWeightKg, setExerciseWeightKg] = useState(40);
  const [newSessionExercises, setNewSessionExercises] = useState([]);
  const [savingNewSession, setSavingNewSession] = useState(false);
  const [newSessionError, setNewSessionError] = useState('');

  // Edit Workout Form state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDurationMins, setEditDurationMins] = useState(45);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  // Modal inline add-exercise: Muscle Filter & Exercise Selector
  const [inlineMuscle, setInlineMuscle] = useState('All');
  const [inlineExerciseId, setInlineExerciseId] = useState('');
  const [inlineSetsCount, setInlineSetsCount] = useState(3);
  const [inlineRepsCount, setInlineRepsCount] = useState(10);
  const [inlineWeightKg, setInlineWeightKg] = useState(40);
  const [addingInlineExercise, setAddingInlineExercise] = useState(false);
  const [inlineSuccessMsg, setInlineSuccessMsg] = useState('');
  const [inlineErrorMsg, setInlineErrorMsg] = useState('');

  // Editable set item in modal: { setId: { reps, weight } }
  const [editingSets, setEditingSets] = useState({});
  const [updatingSetId, setUpdatingSetId] = useState(null);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (format) => {
    try {
      setExporting(true);
      setShowExportMenu(false);
      const res = format === 'csv' ? await workoutAPI.exportCSV() : await workoutAPI.exportJSON();
      const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laksh_workouts_${getLocalDateStr()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export workouts:', err);
      alert('Failed to export workout data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Fetch all workouts & exercise library & PRs
  const fetchWorkouts = async () => {
    try {
      const [wRes, activeRes, exRes, prRes] = await Promise.all([
        workoutAPI.listWorkouts({ limit: 50 }),
        workoutAPI.getActiveWorkout().catch(() => ({ data: null })),
        exerciseAPI.listExercises(),
        analyticsAPI.getPersonalRecords().catch(() => ({ data: [] })),
      ]);
      setWorkouts(wRes.data || []);
      setActiveSession(activeRes.data);
      const list = exRes.data || [];
      setExercisesList(list);
      setPersonalRecords(prRes.data || []);

      // Initialize selected exercise IDs if unset
      if (list.length > 0) {
        setSelectedExerciseId((prev) => prev || String(list[0].id));
        setInlineExerciseId((prev) => prev || String(list[0].id));
      }
    } catch (err) {
      console.error('Failed to load workouts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Quick Start / Resume Live Workout
  const handleQuickStart = async () => {
    if (activeSession) {
      navigate('/workouts/active');
      return;
    }
    try {
      const today = getLocalDateStr();
      await workoutAPI.createWorkout({
        title: 'Gym Workout',
        workout_date: today,
        status: 'IN_PROGRESS',
      });
      navigate('/workouts/active');
    } catch (err) {
      navigate('/workouts/active');
    }
  };

  // Change Muscle Tab in New Session Modal
  const handleNewSessionMuscleChange = (muscle) => {
    setNewSessionMuscle(muscle);
    const filtered = filterExercisesByMuscle(exercisesList, muscle);
    if (filtered.length > 0) {
      setSelectedExerciseId(String(filtered[0].id));
    }
  };

  // Add exercise to new session draft
  const handleAddExerciseToDraft = () => {
    const filtered = filterExercisesByMuscle(exercisesList, newSessionMuscle);
    const targetId = selectedExerciseId || (filtered[0]?.id ? String(filtered[0].id) : null);
    if (!targetId) return;

    const exObj = exercisesList.find((e) => String(e.id) === String(targetId));
    if (!exObj) return;

    setNewSessionExercises((prev) => [
      ...prev,
      {
        exercise_id: exObj.id,
        exercise_name: exObj.name,
        muscle_group: exObj.muscle_group,
        sets_count: Math.max(1, Number(exerciseSetsCount) || 1),
        reps_count: Math.max(1, Number(exerciseRepsCount) || 1),
        weight_kg: Math.max(0, Number(exerciseWeightKg) || 0),
      },
    ]);
  };

  const handleRemoveDraftExercise = (index) => {
    setNewSessionExercises((prev) => prev.filter((_, i) => i !== index));
  };

  // Save New Session
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSavingNewSession(true);
    setNewSessionError('');
    try {
      const durationSeconds = Math.max(60, Number(newDurationMins || 45) * 60);
      const res = await workoutAPI.createWorkout({
        title: newTitle || 'Workout Session',
        workout_date: newDate,
        duration_seconds: durationSeconds,
        notes: newNotes,
        status: 'COMPLETED',
      });
      const createdWorkout = res.data;

      // Add each exercise with specified sets and reps
      for (let i = 0; i < newSessionExercises.length; i++) {
        const item = newSessionExercises[i];
        const exRes = await workoutAPI.addExercise(createdWorkout.id, {
          exercise_id: item.exercise_id,
          order_index: i + 1,
        });
        const weId = exRes.data.id;

        for (let s = 1; s <= item.sets_count; s++) {
          await workoutAPI.addSet(weId, {
            set_number: s,
            repetitions: item.reps_count,
            weight_kg: item.weight_kg,
            is_completed: true,
          });
        }
      }

      setShowNewSessionModal(false);
      setNewTitle('Chest & Triceps');
      setNewNotes('');
      setNewSessionExercises([]);
      await fetchWorkouts();
    } catch (err) {
      console.error('Failed to create custom session:', err);
      setNewSessionError(
        err.response?.data?.detail || 'Failed to save workout session. Please check your inputs and try again.'
      );
    } finally {
      setSavingNewSession(false);
    }
  };

  // Open Details Modal
  const handleViewDetails = async (id, startInEditMode = false) => {
    try {
      const res = await workoutAPI.getWorkout(id);
      setSelectedWorkout(res.data);
      setIsEditingWorkout(startInEditMode);
      setEditTitle(res.data.title || '');
      setEditDate(res.data.workout_date);
      setEditDurationMins(Math.max(1, Math.round((res.data.duration_seconds || 0) / 60)) || 45);
      setEditNotes(res.data.notes || '');
      setEditSuccessMsg('');
      setEditErrorMsg('');
      setInlineSuccessMsg('');
      setInlineErrorMsg('');

      // Guess muscle from workout title if applicable
      const titleLower = (res.data.title || '').toLowerCase();
      let guessedMuscle = 'All';
      if (titleLower.includes('chest') || titleLower.includes('push')) guessedMuscle = 'Chest';
      else if (titleLower.includes('back') || titleLower.includes('pull')) guessedMuscle = 'Back';
      else if (titleLower.includes('leg') || titleLower.includes('squat')) guessedMuscle = 'Legs';
      else if (titleLower.includes('shoulder')) guessedMuscle = 'Shoulders';
      else if (titleLower.includes('arm') || titleLower.includes('bicep') || titleLower.includes('tricep')) guessedMuscle = 'Arms';
      else if (titleLower.includes('abs') || titleLower.includes('core')) guessedMuscle = 'Abs';
      
      setInlineMuscle(guessedMuscle);
      const filtered = filterExercisesByMuscle(exercisesList, guessedMuscle);
      if (filtered.length > 0) {
        setInlineExerciseId(String(filtered[0].id));
      } else if (exercisesList.length > 0) {
        setInlineExerciseId(String(exercisesList[0].id));
      }

      // Populate set edit cache
      const initialSetState = {};
      res.data.exercises?.forEach((we) => {
        we.sets?.forEach((st) => {
          initialSetState[st.id] = { reps: st.repetitions, weight: st.weight_kg || 0 };
        });
      });
      setEditingSets(initialSetState);
    } catch (err) {
      console.error('Failed to fetch workout details:', err);
    }
  };

  // Save Workout Edit (Title, Date, Duration, Notes)
  const handleSaveEdit = async () => {
    if (!selectedWorkout) return;
    setSavingEdit(true);
    setEditSuccessMsg('');
    setEditErrorMsg('');
    try {
      const payload = {
        title: editTitle.trim() || 'Workout Session',
        workout_date: editDate,
        duration_seconds: Math.max(60, Number(editDurationMins) * 60),
        notes: editNotes,
      };
      const res = await workoutAPI.updateWorkout(selectedWorkout.id, payload);
      setSelectedWorkout(res.data);
      setIsEditingWorkout(false);
      setEditSuccessMsg('Workout details saved successfully!');
      setTimeout(() => setEditSuccessMsg(''), 3000);
      await fetchWorkouts();
    } catch (err) {
      console.error('Failed to update workout:', err);
      setEditErrorMsg(err.response?.data?.detail || 'Failed to update workout.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Change Muscle Tab inside Edit/Details Modal
  const handleInlineMuscleChange = (muscle) => {
    setInlineMuscle(muscle);
    const filtered = filterExercisesByMuscle(exercisesList, muscle);
    if (filtered.length > 0) {
      setInlineExerciseId(String(filtered[0].id));
    }
  };

  // Inline add exercise to existing workout from Details modal
  const handleAddInlineExercise = async () => {
    if (!selectedWorkout) {
      setInlineErrorMsg('No active workout session selected.');
      return;
    }

    const filtered = filterExercisesByMuscle(exercisesList, inlineMuscle);
    const targetExerciseId = inlineExerciseId || (filtered[0]?.id ? String(filtered[0].id) : null);
    if (!targetExerciseId) {
      setInlineErrorMsg('Please select an exercise from the dropdown.');
      return;
    }

    setAddingInlineExercise(true);
    setInlineSuccessMsg('');
    setInlineErrorMsg('');

    try {
      const exRes = await workoutAPI.addExercise(selectedWorkout.id, {
        exercise_id: Number(targetExerciseId),
        order_index: (selectedWorkout.exercises?.length || 0) + 1,
      });
      const weId = exRes.data.id;

      const setsCount = Math.max(1, Number(inlineSetsCount) || 1);
      const repsCount = Math.max(1, Number(inlineRepsCount) || 10);
      const weightKg = Math.max(0, Number(inlineWeightKg) || 0);

      for (let s = 1; s <= setsCount; s++) {
        await workoutAPI.addSet(weId, {
          set_number: s,
          repetitions: repsCount,
          weight_kg: weightKg,
          is_completed: true,
        });
      }

      // Refresh details and update local state
      const refreshed = await workoutAPI.getWorkout(selectedWorkout.id);
      setSelectedWorkout(refreshed.data);

      const addedExerciseName = refreshed.data.exercises?.slice(-1)[0]?.exercise_name || 'Exercise';
      setInlineSuccessMsg(`Added ${addedExerciseName} (${setsCount} sets × ${repsCount} reps) successfully!`);
      setTimeout(() => setInlineSuccessMsg(''), 4000);

      // Populate set edit cache for new sets
      const updatedSetState = { ...editingSets };
      refreshed.data.exercises?.forEach((we) => {
        we.sets?.forEach((st) => {
          if (!updatedSetState[st.id]) {
            updatedSetState[st.id] = { reps: st.repetitions, weight: st.weight_kg || 0 };
          }
        });
      });
      setEditingSets(updatedSetState);

      await fetchWorkouts();
    } catch (err) {
      console.error('Failed to add inline exercise:', err);
      setInlineErrorMsg(err.response?.data?.detail || 'Failed to add exercise. Please try again.');
    } finally {
      setAddingInlineExercise(false);
    }
  };

  // Update specific set values inline
  const handleUpdateSingleSet = async (setId) => {
    const editData = editingSets[setId];
    if (!editData) return;
    setUpdatingSetId(setId);
    try {
      await workoutAPI.updateSet(setId, {
        repetitions: Number(editData.reps),
        weight_kg: Number(editData.weight),
      });
      if (selectedWorkout) {
        const refreshed = await workoutAPI.getWorkout(selectedWorkout.id);
        setSelectedWorkout(refreshed.data);
        await fetchWorkouts();
      }
    } catch (err) {
      console.error('Failed to update set:', err);
    } finally {
      setUpdatingSetId(null);
    }
  };

  // Delete exercise from session
  const handleDeleteExercise = async (workoutExerciseId) => {
    if (!selectedWorkout) return;
    if (!window.confirm('Remove this exercise and its sets from the session?')) return;
    try {
      await workoutAPI.deleteExercise(selectedWorkout.id, workoutExerciseId);
      const refreshed = await workoutAPI.getWorkout(selectedWorkout.id);
      setSelectedWorkout(refreshed.data);
      await fetchWorkouts();
    } catch (err) {
      console.error('Failed to remove exercise:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workout record permanently?')) return;
    try {
      await workoutAPI.deleteWorkout(id);
      if (selectedWorkout?.id === id) setSelectedWorkout(null);
      await fetchWorkouts();
    } catch (err) {
      console.error('Failed to delete workout:', err);
    }
  };

  const formatSeconds = (sec) => {
    if (!sec) return '0 min';
    const mins = Math.floor(sec / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins} min`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filtered exercise lists for New Session modal and Edit modal
  const filteredNewExercises = filterExercisesByMuscle(exercisesList, newSessionMuscle);
  const filteredInlineExercises = filterExercisesByMuscle(exercisesList, inlineMuscle);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-red-500" />
            Workout Sessions
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Log exercises with sets, repetitions, weights, and customizable duration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/records"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all shadow-md shadow-amber-500/10"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>PR Section ({personalRecords.length})</span>
          </Link>

          <Link
            to="/templates"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-bold text-xs transition-all shadow-md shadow-red-500/10"
          >
            <Layers className="w-3.5 h-3.5 text-red-400" />
            <span>Routines</span>
          </Link>

          <button
            onClick={() => {
              setNewSessionError('');
              setShowNewSessionModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 font-bold" />
            Add New Session
          </button>

          <button
            onClick={handleQuickStart}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white font-bold text-xs border border-white/10 transition-all"
          >
            <Timer className="w-3.5 h-3.5 text-red-400" />
            {activeSession ? 'Live Session' : 'Live Stopwatch'}
          </button>

          {/* Data Export Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs border border-white/10 transition-all"
              title="Export Workout History"
            >
              <Download className={`w-3.5 h-3.5 text-red-400 ${exporting ? 'animate-bounce' : ''}`} />
              <span>{exporting ? 'Exporting...' : 'Export'}</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-zinc-950 border border-white/15 shadow-2xl p-1.5 z-50">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-between"
                >
                  <span>Export as CSV</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-200 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-between"
                >
                  <span>Backup JSON</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Raw</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Workout Card if present */}
      {activeSession && (
        <div className="glass-panel p-5 rounded-2xl border border-red-500/30 bg-red-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base">
                Active Session In Progress: {activeSession.title}
              </h3>
              <p className="text-xs text-red-400/80">
                Started {new Date(activeSession.started_at).toLocaleTimeString()} • {activeSession.exercises?.length || 0} exercises
              </p>
            </div>
          </div>
          <Link
            to="/workouts/active"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-md shadow-red-600/30 transition-colors"
          >
            Go to Live Session
          </Link>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EXERCISE PERSONAL RECORDS (PR) SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {personalRecords.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-950/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  Exercise PR Records
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Max Weight & Reps
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Top personal records calculated automatically from your completed workouts.
                </p>
              </div>
            </div>

            <Link
              to="/records"
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all"
            >
              <span>View Full PR Board ({personalRecords.length})</span>
              <Sparkles className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {personalRecords.slice(0, 4).map((pr) => (
              <div
                key={pr.exercise_id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                    {pr.exercise_name}
                  </h4>
                  <span className="text-[10px] text-slate-400 ml-1 shrink-0 font-medium">
                    {pr.muscle_group}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                    <span className="text-[9px] uppercase font-extrabold text-amber-400 block">
                      Max Weight
                    </span>
                    <span className="text-sm font-black text-white">
                      {pr.max_weight_kg > 0 ? `${pr.max_weight_kg}` : '0'}<span className="text-[10px] font-normal text-slate-400 ml-0.5">kg</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      × {pr.max_weight_reps} reps
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-red-600/10 border border-red-500/20">
                    <span className="text-[9px] uppercase font-extrabold text-red-400 block">
                      Max Reps
                    </span>
                    <span className="text-sm font-black text-white">
                      {pr.max_reps}<span className="text-[10px] font-normal text-slate-400 ml-0.5">r</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      @ {pr.max_reps_weight_kg}kg
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workouts Grid */}
      {workouts.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border border-dashed border-slate-800 text-center space-y-4">
          <Dumbbell className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">No Workout Sessions Yet</h3>
            <p className="text-xs text-slate-400 mt-1">Add your workout routine with exercise dropdown, sets, and reps.</p>
          </div>
          <button
            onClick={() => setShowNewSessionModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="glass-panel-interactive p-5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-red-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-base">
                      {w.title || 'Workout Session'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{w.workout_date}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    w.status === 'COMPLETED'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {w.status}
                  </span>
                </div>

                {/* Duration, Volume, and Exercises Overview (Without raw sets clutter) */}
                <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-white/5 text-center">
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Duration</span>
                    <span className="text-sm font-bold text-white font-mono flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-red-400 inline" />
                      {formatSeconds(w.duration_seconds)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Exercises</span>
                    <span className="text-sm font-bold text-white">
                      {w.exercise_count || w.exercises?.length || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Volume</span>
                    <span className="text-sm font-bold text-red-400">
                      {(w.total_volume || 0).toLocaleString()} kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewDetails(w.id, false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-red-400" />
                    View Details
                  </button>
                  <button
                    onClick={() => handleViewDetails(w.id, true)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 transition-colors border border-red-500/20"
                    title="Edit what you did & duration"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(w.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD NEW WORKOUT SESSION WITH EXERCISE DROPDOWN */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#0d0e12] border border-red-500/20 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Add Workout Session</h3>
                  <p className="text-xs text-zinc-400">Define what you did, duration, and exercise sets/reps</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newSessionError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{newSessionError}</span>
                <button onClick={() => setNewSessionError('')}><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              
              {/* What I Am Doing (Session Title) */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase block mb-1">
                  What are you doing? (Workout Session Title)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chest & Triceps, Leg Day, Full Body"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
                
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_ACTIVITIES.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setNewTitle(item.name);
                        handleNewSessionMuscleChange(item.defaultMuscle);
                      }}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        newTitle === item.name
                          ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase block mb-1">
                    Workout Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase">
                      Duration (Minutes)
                    </label>
                    <span className="text-[11px] text-red-400 font-bold font-mono">
                      {newDurationMins} mins
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="360"
                      required
                      value={newDurationMins}
                      onChange={(e) => setNewDurationMins(e.target.value)}
                      className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-zinc-500">mins</span>
                  </div>
                  {/* Preset duration buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {PRESET_DURATIONS.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setNewDurationMins(mins)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                          Number(newDurationMins) === mins
                            ? 'bg-red-600 text-white font-bold'
                            : 'bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exercise Selector Box: Filtered by Muscle Group with Sets & Reps */}
              <div className="p-4 rounded-2xl bg-[#121318] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Exercise Dropdown with Sets & Reps
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {newSessionExercises.length} added
                  </span>
                </div>

                {/* Muscle Group Filter Selector */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1.5">
                    Select Muscle Group / Body Part:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSCLE_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleNewSessionMuscleChange(tab.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          newSessionMuscle === tab.id
                            ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                            : 'bg-[#181920] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                      Select Exercise ({filteredNewExercises.length} available)
                    </label>
                    <select
                      value={selectedExerciseId}
                      onChange={(e) => setSelectedExerciseId(e.target.value)}
                      className="w-full rounded-xl bg-[#181920] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      {filteredNewExercises.map((ex) => (
                        <option key={ex.id} value={String(ex.id)}>
                          {ex.name} ({ex.muscle_group})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Sets Count</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={exerciseSetsCount}
                      onChange={(e) => setExerciseSetsCount(e.target.value)}
                      className="w-full rounded-xl bg-[#181920] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Reps / Set</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={exerciseRepsCount}
                      onChange={(e) => setExerciseRepsCount(e.target.value)}
                      className="w-full rounded-xl bg-[#181920] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold text-zinc-400">Weight (kg):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={exerciseWeightKg}
                      onChange={(e) => setExerciseWeightKg(e.target.value)}
                      className="w-20 rounded-lg bg-[#181920] border border-zinc-800 px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExerciseToDraft}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-xs shadow-md shadow-red-500/20 hover:brightness-110 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Exercise ({exerciseSetsCount} sets × {exerciseRepsCount} reps)
                  </button>
                </div>

                {/* List of exercises in draft */}
                {newSessionExercises.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    {newSessionExercises.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#181920] border border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-red-600/15 text-red-400 flex items-center justify-center font-bold text-[10px] border border-red-500/30">
                            {idx + 1}
                          </span>
                          <div>
                            <strong className="text-white">{item.exercise_name}</strong>
                            <span className="text-zinc-400 ml-2">
                              {item.sets_count} sets × {item.reps_count} reps @ {item.weight_kg}kg
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftExercise(idx)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="How did the session feel? Any achievements or milestones?"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full rounded-xl bg-[#121318] border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewSession}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:brightness-110 disabled:opacity-50"
                >
                  {savingNewSession ? 'Saving Session...' : 'Save Workout Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: VIEW & EDIT WORKOUT SESSION DETAILS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[#0d0e12] border border-red-500/20 p-6 sm:p-8 shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex-1 mr-4">
                {isEditingWorkout ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">
                      Edit What You Are Doing & Duration
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Session Title (e.g. Chest & Triceps)"
                      className="rounded-xl bg-[#121318] border border-red-500 px-3.5 py-2 text-base font-bold text-white focus:outline-none w-full"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block mb-1 font-semibold">Date</span>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="rounded-lg bg-[#121318] border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block mb-1 font-semibold">Duration (mins)</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="360"
                            value={editDurationMins}
                            onChange={(e) => setEditDurationMins(e.target.value)}
                            className="w-20 rounded-lg bg-[#121318] border border-zinc-800 px-2.5 py-1.5 text-xs text-white font-bold"
                          />
                          <span className="text-xs text-zinc-400">mins</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {selectedWorkout.title || 'Workout Session'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {selectedWorkout.workout_date}
                      </span>
                      <span className="flex items-center gap-1 text-red-400 font-semibold font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {formatSeconds(selectedWorkout.duration_seconds)} duration
                      </span>
                      <span>•</span>
                      <span>{selectedWorkout.exercises?.length || 0} exercises</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditingWorkout ? (
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-red-500/25 transition-all hover:brightness-110"
                  >
                    <Check className="w-4 h-4 font-bold" />
                    Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingWorkout(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 text-xs font-semibold transition-colors border border-red-500/20"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit What You Did & Duration
                  </button>
                )}
                <button
                  onClick={() => setSelectedWorkout(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {editSuccessMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-600/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            {editErrorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                <span>{editErrorMsg}</span>
              </div>
            )}

            {/* Exercises List in Session */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              
              {/* Exercise Dropdown with Sets & Reps to add more exercises */}
              <div className="p-4 rounded-2xl bg-[#121318] border border-red-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add More Exercises with Sets & Reps
                  </span>
                </div>

                {inlineSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-red-600/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
                    <CheckCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{inlineSuccessMsg}</span>
                  </div>
                )}

                {inlineErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-fadeIn">
                    <span>{inlineErrorMsg}</span>
                  </div>
                )}

                {/* Muscle Group Filter Selector */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1.5">
                    Select Muscle Group / Body Part:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MUSCLE_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleInlineMuscleChange(tab.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          inlineMuscle === tab.id
                            ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/30'
                            : 'bg-[#181920] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">
                      Select Exercise ({filteredInlineExercises.length} available)
                    </label>
                    <select
                      value={inlineExerciseId}
                      onChange={(e) => setInlineExerciseId(e.target.value)}
                      className="w-full rounded-xl bg-[#181920] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      {filteredInlineExercises.map((ex) => (
                        <option key={ex.id} value={String(ex.id)}>
                          {ex.name} ({ex.muscle_group})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Sets Count</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={inlineSetsCount}
                      onChange={(e) => setInlineSetsCount(e.target.value)}
                      className="w-full rounded-xl bg-[#181920] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 block mb-1">Reps / Set</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={inlineRepsCount}
                      onChange={(e) => setInlineRepsCount(e.target.value)}
                      className="w-full rounded-xl bg-[#181920] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-semibold">Weight (kg):</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={inlineWeightKg}
                      onChange={(e) => setInlineWeightKg(e.target.value)}
                      className="w-20 rounded-lg bg-[#181920] border border-zinc-800 px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <button
                    onClick={handleAddInlineExercise}
                    disabled={addingInlineExercise}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-md shadow-red-500/20 disabled:opacity-50 hover:brightness-110"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingInlineExercise ? 'Adding Exercise...' : `+ Add Exercise (${inlineSetsCount} sets × ${inlineRepsCount} reps)`}
                  </button>
                </div>
              </div>

              {/* Existing Exercises in this session */}
              {(!selectedWorkout.exercises || selectedWorkout.exercises.length === 0) ? (
                <p className="text-xs text-zinc-500 text-center py-6">No exercises added to this session yet.</p>
              ) : (
                selectedWorkout.exercises.map((we, idx) => {
                  const completed = we.sets?.filter((s) => s.is_completed) || [];
                  const setsCount = we.sets?.length || 0;
                  const totalReps = we.sets?.reduce((sum, s) => sum + (s.repetitions || 0), 0) || 0;
                  const avgReps = setsCount > 0 ? Math.round(totalReps / setsCount) : 0;
                  const vol = we.sets?.reduce((sum, s) => sum + ((s.weight_kg || 0) * (s.repetitions || 0)), 0) || 0;

                  return (
                    <div key={we.id} className="p-4 rounded-2xl bg-[#121318] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-red-600/15 text-red-400 flex items-center justify-center text-xs font-bold border border-red-500/30">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-white">
                              {we.exercise_name || `Exercise #${we.exercise_id}`}
                            </h4>
                            {we.muscle_group && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-zinc-400 font-medium">
                                {we.muscle_group}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Sets & Reps badge */}
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                            {setsCount} Sets × ~{avgReps} Reps
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-red-600/15 text-red-300 font-bold border border-red-500/25">
                            {Math.round(vol).toLocaleString()} kg vol
                          </span>
                          {(() => {
                            const prRecord = personalRecords.find((r) => r.exercise_id === we.exercise_id);
                            if (prRecord) {
                              return (
                                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                                  <Trophy className="w-3 h-3 text-amber-400" />
                                  PR: {prRecord.max_weight_kg}kg ({prRecord.max_reps}r)
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <button
                            onClick={() => handleDeleteExercise(we.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Remove exercise"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sets breakdown with editable reps & weight */}
                      <div className="space-y-1.5 pt-1">
                        {we.sets?.map((st) => {
                          const editData = editingSets[st.id] || { reps: st.repetitions, weight: st.weight_kg || 0 };
                          const isUpdating = updatingSetId === st.id;

                          return (
                            <div
                              key={st.id}
                              className="px-3 py-1.5 rounded-xl bg-[#181920] border border-zinc-800 text-xs flex items-center justify-between"
                            >
                              <span className="text-zinc-400 font-semibold w-16">Set {st.set_number}:</span>
                              
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-zinc-400">Reps:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editData.reps}
                                    onChange={(e) =>
                                      setEditingSets((prev) => ({
                                        ...prev,
                                        [st.id]: { ...editData, reps: e.target.value },
                                      }))
                                    }
                                    className="w-14 rounded-md bg-[#121318] border border-zinc-700 px-1.5 py-0.5 text-center text-white"
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-zinc-400">Weight:</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={editData.weight}
                                    onChange={(e) =>
                                      setEditingSets((prev) => ({
                                        ...prev,
                                        [st.id]: { ...editData, weight: e.target.value },
                                      }))
                                    }
                                    className="w-16 rounded-md bg-[#121318] border border-zinc-700 px-1.5 py-0.5 text-center text-white"
                                  />
                                  <span className="text-[10px] text-zinc-500">kg</span>
                                </div>

                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateSingleSet(st.id)}
                                  className="p-1 rounded bg-white/5 hover:bg-red-600 hover:text-white text-zinc-400 transition-colors"
                                  title="Update set"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-zinc-400">
              <span>Total Volume: <strong className="text-red-400">{(selectedWorkout.total_volume || 0).toLocaleString()} kg</strong></span>
              <button
                onClick={() => setSelectedWorkout(null)}
                className="px-5 py-2 rounded-xl bg-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
