import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Dumbbell, 
  Timer, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Layers,
  Edit2,
  Calculator,
  Volume2,
  VolumeX,
  Ghost,
  Flame,
  TrendingDown,
  Zap
} from 'lucide-react';
import { workoutAPI, exerciseAPI } from '../services/api';
import { getLocalDateStr } from '../utils/dateUtils';
import PlateCalculator from '../components/PlateCalculator';

// Set type configuration
const SET_TYPES = {
  NORMAL:  { label: 'N', fullLabel: 'Normal',   color: 'slate',   bgClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  WARMUP:  { label: 'W', fullLabel: 'Warm-up',  color: 'amber',   bgClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  DROP:    { label: 'D', fullLabel: 'Drop Set',  color: 'purple',  bgClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  FAILURE: { label: 'F', fullLabel: 'To Failure', color: 'rose',   bgClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

// 1RM calculation (Epley formula)
function calculateEstimated1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [allExercises, setAllExercises] = useState([]);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('');
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');

  // Rest timer
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [restTimerTotal, setRestTimerTotal] = useState(0);
  const restTimerRef = useRef(null);

  // Rest timer audio
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef(null);

  // Ghost data (previous session performance)
  const [previousSetsData, setPreviousSetsData] = useState({}); // { exerciseId: { sets: [...], workout_date: "..." } }

  // Plate calculator
  const [showPlateCalculator, setShowPlateCalculator] = useState(false);

  // Set type selector dropdown
  const [openSetTypeDropdown, setOpenSetTypeDropdown] = useState(null); // set ID

  // Play audio cue when rest timer hits 0
  const playRestTimerBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Triple beep pattern
      [0, 0.2, 0.4].forEach((delay) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.15);
        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + 0.15);
      });

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [soundEnabled]);

  // Fetch active workout
  const fetchActiveWorkout = async () => {
    try {
      const res = await workoutAPI.getActiveWorkout();
      let activeData = res.data;
      if (!activeData) {
        // Auto-create active session if none exists
        const today = getLocalDateStr();
        const createRes = await workoutAPI.createWorkout({
          title: 'Live Workout Session',
          workout_date: today,
          status: 'IN_PROGRESS',
        });
        activeData = createRes.data;
      }
      setWorkout(activeData);
      setLiveTitle(activeData.title || 'Live Workout Session');

      // Compute elapsed seconds from started_at
      if (activeData.started_at) {
        const start = new Date(activeData.started_at).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - start) / 1000));
        setElapsedSeconds(diff);
      }

      // Fetch ghost data for all exercises in the workout
      if (activeData.exercises?.length) {
        fetchGhostDataForExercises(activeData.exercises);
      }
    } catch (err) {
      console.error('Error in fetchActiveWorkout:', err);
      try {
        const today = getLocalDateStr();
        const createRes = await workoutAPI.createWorkout({
          title: 'Live Workout Session',
          workout_date: today,
          status: 'IN_PROGRESS',
        });
        setWorkout(createRes.data);
        setLiveTitle(createRes.data.title || 'Live Workout Session');
        setElapsedSeconds(0);
      } catch (fallbackErr) {
        console.error('Fallback creation failed:', fallbackErr);
        navigate('/workouts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch ghost data for exercises
  const fetchGhostDataForExercises = async (exercises) => {
    const uniqueExerciseIds = [...new Set(exercises.map((e) => e.exercise_id))];
    const results = {};
    
    await Promise.allSettled(
      uniqueExerciseIds.map(async (exId) => {
        try {
          const res = await workoutAPI.getPreviousSets(exId);
          if (res.data?.previous_sets?.length) {
            results[exId] = {
              sets: res.data.previous_sets,
              workout_date: res.data.workout_date,
            };
          }
        } catch {
          // Silently skip
        }
      })
    );
    
    setPreviousSetsData((prev) => ({ ...prev, ...results }));
  };

  useEffect(() => {
    fetchActiveWorkout();
    exerciseAPI.listExercises().then((res) => setAllExercises(res.data || [])).catch(console.error);
  }, []);

  // Main workout elapsed timer
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && workout) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, workout]);

  // Rest Timer ticker
  useEffect(() => {
    if (restSecondsRemaining > 0) {
      restTimerRef.current = setInterval(() => {
        setRestSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current);
            playRestTimerBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restTimerRef.current);
  }, [restSecondsRemaining, playRestTimerBeep]);

  const startRestTimer = (seconds) => {
    setRestTimerTotal(seconds);
    setRestSecondsRemaining(seconds);
  };

  const formatTimer = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add Exercise to current session
  const handleAddExercise = async (exerciseId) => {
    try {
      await workoutAPI.addExercise(workout.id, {
        exercise_id: exerciseId,
        order_index: (workout.exercises?.length || 0) + 1,
      });
      setShowAddExerciseModal(false);
      setExerciseSearch('');
      fetchActiveWorkout();
    } catch (err) {
      console.error('Failed to add exercise:', err);
    }
  };

  // Remove exercise from session
  const handleRemoveExercise = async (workoutExerciseId) => {
    if (!window.confirm('Remove this exercise from your workout?')) return;
    try {
      await workoutAPI.deleteExercise(workout.id, workoutExerciseId);
      fetchActiveWorkout();
    } catch (err) {
      console.error('Failed to remove exercise:', err);
    }
  };

  // Add Set to an exercise
  const handleAddSet = async (workoutExerciseId, exerciseId) => {
    const we = workout.exercises.find((e) => e.id === workoutExerciseId);
    const nextSetNum = (we?.sets?.length || 0) + 1;
    const lastSet = we?.sets?.[we.sets.length - 1];

    // Use ghost data for defaults if no previous sets in current workout
    const ghost = previousSetsData[exerciseId];
    const ghostSet = ghost?.sets?.[nextSetNum - 1];

    const defaultReps = lastSet?.repetitions ?? ghostSet?.repetitions ?? 10;
    const defaultWeight = lastSet?.weight_kg ?? ghostSet?.weight_kg ?? 20.0;

    try {
      await workoutAPI.addSet(workoutExerciseId, {
        set_number: nextSetNum,
        repetitions: defaultReps,
        weight_kg: defaultWeight,
        rest_seconds: 90,
        set_type: 'NORMAL',
      });
      fetchActiveWorkout();
    } catch (err) {
      console.error('Failed to add set:', err);
    }
  };

  // Update Set (reps, weight, completed, set_type)
  const handleUpdateSet = async (setId, field, val, autoRest = false) => {
    try {
      const payload = { [field]: val };
      await workoutAPI.updateSet(setId, payload);
      
      if (field === 'is_completed' && val === true && autoRest) {
        startRestTimer(90); // Trigger standard 90s rest timer
      }
      fetchActiveWorkout();
    } catch (err) {
      console.error('Failed to update set:', err);
    }
  };

  // Delete set
  const handleDeleteSet = async (setId) => {
    try {
      await workoutAPI.deleteSet(setId);
      fetchActiveWorkout();
    } catch (err) {
      console.error('Failed to delete set:', err);
    }
  };

  // Save workout title
  const handleSaveTitle = async () => {
    if (!workout) return;
    try {
      await workoutAPI.updateWorkout(workout.id, { title: liveTitle });
      setWorkout((prev) => ({ ...prev, title: liveTitle }));
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update session title:', err);
    }
  };

  // Finish Workout
  const handleFinish = async () => {
    if (!window.confirm('Complete and finish this workout session?')) return;
    try {
      await workoutAPI.finishWorkout(workout.id);
      navigate('/workouts');
    } catch (err) {
      console.error('Failed to finish workout:', err);
    }
  };

  // Cancel Workout
  const handleCancel = async () => {
    if (!window.confirm('Cancel this workout session? Progress from this session will be discarded.')) return;
    try {
      await workoutAPI.cancelWorkout(workout.id);
      navigate('/workouts');
    } catch (err) {
      console.error('Failed to cancel workout:', err);
    }
  };

  const filteredExercises = allExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchesMuscle = !selectedMuscle || ex.muscle_group === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!workout) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      
      {/* Active Workout Header Bar */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-red-500/30 bg-gradient-to-r from-[#0d0e12] via-[#140b0d] to-[#08080a] shadow-xl shadow-red-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                LIVE WORKOUT SESSION
              </span>
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={liveTitle}
                  onChange={(e) => setLiveTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="rounded-xl bg-[#121318] border border-red-500 px-3 py-1 text-base sm:text-xl font-bold text-white focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
                  title="Save title"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setLiveTitle(workout.title || 'Strength Session');
                    setIsEditingTitle(false);
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white">
                  {workout.title || 'Strength Session'}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                  title="Edit what you are doing"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-xs text-zinc-400 mt-0.5">
              {workout.workout_date} • {workout.exercises?.length || 0} exercises
            </p>
          </div>

          {/* Stopwatch Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#121318] border border-zinc-800">
              <Timer className="w-5 h-5 text-red-400" />
              <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
                {formatTimer(elapsedSeconds)}
              </span>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-red-400" />}
              </button>
            </div>

            {/* Utility Buttons */}
            <button
              onClick={() => setShowPlateCalculator(true)}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
              title="Plate Calculator"
            >
              <Calculator className="w-5 h-5" />
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border border-transparent transition-all ${
                soundEnabled
                  ? 'text-red-400 hover:bg-red-600/10 hover:border-red-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
              title={soundEnabled ? 'Sound On — Click to mute' : 'Sound Off — Click to unmute'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Finish</span>
            </button>
            
            <button
              onClick={handleCancel}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Cancel Workout"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Rest Timer Pill */}
        {restSecondsRemaining > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between bg-red-950/40 px-4 py-2 rounded-xl border border-red-500/30 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Rest Timer:</span>
              <span className="font-mono text-sm font-bold text-white">{restSecondsRemaining}s</span>
              {/* Progress bar */}
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-2">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${((restTimerTotal - restSecondsRemaining) / restTimerTotal) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestSecondsRemaining((prev) => prev + 30)}
                className="text-[11px] px-2 py-0.5 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30"
              >
                +30s
              </button>
              <button
                onClick={() => setRestSecondsRemaining(0)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exercises In Workout */}
      <div className="space-y-4">
        {(!workout.exercises || workout.exercises.length === 0) ? (
          <div className="glass-panel p-12 rounded-3xl border border-dashed border-zinc-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Exercises Added Yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Add exercises from your exercise library to start logging sets, weights, and repetitions.
              </p>
            </div>
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add First Exercise
            </button>
          </div>
        ) : (
          workout.exercises.map((we, index) => {
            const ghost = previousSetsData[we.exercise_id];
            
            return (
            <div
              key={we.id}
              className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 bg-gradient-to-b from-[#101116] to-[#0a0a0d]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600/15 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base sm:text-lg">
                      {we.exercise_name || `Exercise #${we.exercise_id}`}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      {we.muscle_group && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 font-medium">
                          {we.muscle_group}
                        </span>
                      )}
                      <span>•</span>
                      <span>{we.sets?.length || 0} sets</span>
                      {/* Estimated 1RM from best completed set */}
                      {(() => {
                        const completedSets = we.sets?.filter(s => s.is_completed && s.weight_kg > 0 && s.set_type !== 'WARMUP') || [];
                        if (completedSets.length === 0) return null;
                        const best1RM = Math.max(...completedSets.map(s => calculateEstimated1RM(s.weight_kg, s.repetitions)));
                        return (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-semibold" title="Estimated 1RM">
                              ~{best1RM} kg e1RM
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Rest timer presets */}
                  <div className="hidden sm:flex items-center gap-1">
                    {[60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => startRestTimer(sec)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                        title={`Start ${sec}s Rest Timer`}
                      >
                        <RotateCcw className="w-3 h-3 text-red-400" />
                        {sec}s
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleRemoveExercise(we.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove Exercise"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ghost Data Banner */}
              {ghost && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/20 border border-red-500/20">
                  <Ghost className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-[11px] text-zinc-300">
                    <span className="font-semibold text-red-400">Last session ({ghost.workout_date}):</span>{' '}
                    {ghost.sets.map((s) => `${s.weight_kg || 0}kg × ${s.repetitions}`).join(', ')}
                  </span>
                </div>
              )}

              {/* Per-Exercise Live Stats Header: SETS / REPS & VOLUME LIFTED */}
              {(() => {
                const completedSets = we.sets?.filter((s) => s.is_completed) || [];
                const workingSets = completedSets.filter((s) => (s.set_type || 'NORMAL') !== 'WARMUP');
                const exSets = workingSets.length;
                const exReps = workingSets.reduce((sum, s) => sum + (s.repetitions || 0), 0);
                const exVol = workingSets.reduce((sum, s) => sum + ((s.weight_kg || 0) * (s.repetitions || 0)), 0);
                return (
                  <div className="grid grid-cols-2 gap-3 py-1">
                    <div className="rounded-xl bg-[#14151b] border border-white/5 px-3 py-2 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Sets / Reps
                        </span>
                        <span className="text-base font-extrabold text-white">
                          {exSets} <span className="text-xs font-normal text-zinc-400">/ {we.sets?.length || 0}</span> • {exReps} <span className="text-xs font-normal text-zinc-400">reps</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 text-zinc-300">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-600/10 border border-red-500/20 px-3 py-2 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Volume Lifted
                        </span>
                        <span className="text-base font-extrabold text-white">
                          {Math.round(exVol).toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-red-600/20 text-red-400">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })()}


              {/* Sets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/5">
                      <th className="py-2 px-3 w-12 text-center">Set</th>
                      <th className="py-2 px-2 w-16 text-center">Type</th>
                      <th className="py-2 px-3">Weight (kg)</th>
                      <th className="py-2 px-3">Reps</th>
                      <th className="py-2 px-3 w-16 text-center">Done</th>
                      <th className="py-2 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {we.sets?.map((set) => {
                      const setType = SET_TYPES[set.set_type || 'NORMAL'] || SET_TYPES.NORMAL;
                      const ghostSet = ghost?.sets?.[set.set_number - 1];
                      
                      return (
                      <tr
                        key={set.id}
                        className={`transition-colors ${
                          set.is_completed ? 'bg-red-600/10' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-zinc-400 text-xs">
                          {set.set_number}
                        </td>
                        {/* Set Type Badge */}
                        <td className="py-2.5 px-2 text-center relative">
                          <button
                            onClick={() => setOpenSetTypeDropdown(openSetTypeDropdown === set.id ? null : set.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${setType.bgClass} transition-colors`}
                            title={`Set type: ${setType.fullLabel}`}
                          >
                            {setType.label}
                          </button>
                          {/* Dropdown */}
                          {openSetTypeDropdown === set.id && (
                            <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-[#121318] border border-zinc-800 rounded-lg shadow-xl py-1 min-w-[120px]">
                              {Object.entries(SET_TYPES).map(([key, cfg]) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    handleUpdateSet(set.id, 'set_type', key);
                                    setOpenSetTypeDropdown(null);
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-white/10 transition-colors ${
                                    (set.set_type || 'NORMAL') === key ? 'text-white font-bold' : 'text-zinc-400'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold border ${cfg.bgClass}`}>
                                    {cfg.label}
                                  </span>
                                  {cfg.fullLabel}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.5"
                            defaultValue={set.weight_kg ?? ''}
                            onBlur={(e) =>
                              handleUpdateSet(set.id, 'weight_kg', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 rounded-lg bg-[#14151b] border border-zinc-800 px-2.5 py-1 text-sm font-semibold text-white focus:outline-none focus:border-red-500"
                            placeholder={ghostSet ? `${ghostSet.weight_kg || 0}` : '0'}
                          />
                          {/* Ghost hint */}
                          {ghostSet && !set.is_completed && (
                            <div className="text-[9px] text-zinc-500 mt-0.5 pl-0.5">
                              Last: {ghostSet.weight_kg}kg
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            defaultValue={set.repetitions}
                            onBlur={(e) =>
                              handleUpdateSet(set.id, 'repetitions', parseInt(e.target.value) || 0)
                            }
                            className="w-20 rounded-lg bg-[#14151b] border border-zinc-800 px-2.5 py-1 text-sm font-semibold text-white focus:outline-none focus:border-red-500"
                            placeholder={ghostSet ? `${ghostSet.repetitions}` : ''}
                          />
                          {ghostSet && !set.is_completed && (
                            <div className="text-[9px] text-zinc-500 mt-0.5 pl-0.5">
                              Last: {ghostSet.repetitions} reps
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSet(set.id, 'is_completed', !set.is_completed, true)
                            }
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all mx-auto ${
                              set.is_completed
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'bg-[#181920] border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(set.id)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleAddSet(we.id, we.exercise_id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 py-1.5 px-3 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Set
                </button>
              </div>
            </div>
          );
          })
        )}

        {/* Add Exercise CTA */}
        {workout.exercises && workout.exercises.length > 0 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#121318] border border-zinc-800 hover:border-red-500 text-zinc-200 hover:text-white font-bold text-sm transition-all"
            >
              <Plus className="w-4 h-4 text-red-400" />
              Add Another Exercise
            </button>
          </div>
        )}
      </div>

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0d0e12] border border-red-500/20 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Choose Exercise</h3>
                  <p className="text-xs text-zinc-400">Select an exercise to add to your workout</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Search */}
            <div className="py-4 space-y-3">
              <input
                type="text"
                placeholder="Search exercise by name..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full rounded-xl bg-[#14151b] border border-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <div className="flex flex-wrap gap-1.5">
                {['', 'Chest', 'Back', 'Quadriceps', 'Hamstrings', 'Shoulders', 'Biceps', 'Triceps', 'Abs'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMuscle(m)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      selectedMuscle === m
                        ? 'bg-red-600/20 border-red-500 text-red-400 font-bold'
                        : 'bg-[#181920] border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m || 'All Muscles'}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No matching exercises found.
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => handleAddExercise(ex.id)}
                    className="p-3 rounded-xl bg-[#14151b] hover:bg-red-600/10 border border-white/5 hover:border-red-500/30 flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                        {ex.name}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {ex.muscle_group} • {ex.equipment}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition-all">
                      <Plus className="w-4 h-4 font-bold" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plate Calculator Modal */}
      <PlateCalculator
        isOpen={showPlateCalculator}
        onClose={() => setShowPlateCalculator(false)}
      />

    </div>
  );
}
