import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  Ruler,
  Weight,
  Target,
  Calendar,
  Mail,
  Shield,
  Save,
  Check,
  AlertCircle,
  Edit3,
  ChevronRight,
  Lock,
  Dumbbell,
  Trophy,
  Flame,
  Zap,
  Heart,
  ArrowRight,
  X,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI, analyticsAPI, getMediaUrl } from '../services/api';

const FITNESS_GOALS = [
  { value: 'Muscle Gain', icon: Dumbbell, color: 'red', desc: 'Build strength & size' },
  { value: 'Fat Loss', icon: Flame, color: 'rose', desc: 'Lean out & cut' },
  { value: 'Endurance', icon: Zap, color: 'amber', desc: 'Boost stamina & cardio' },
  { value: 'Maintain', icon: Shield, color: 'blue', desc: 'Stay fit & healthy' },
  { value: 'Flexibility', icon: Heart, color: 'purple', desc: 'Improve mobility' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [personalRecords, setPersonalRecords] = useState([]);

  // Profile photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Password change modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  // Profile form state
  const [form, setForm] = useState({
    name: '',
    height_cm: '',
    weight_kg: '',
    fitness_goal: '',
    date_of_birth: '',
    gender: '',
    bio: '',
    profile_pic_url: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        height_cm: user.height_cm || '',
        weight_kg: user.weight_kg || '',
        fitness_goal: user.fitness_goal || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        bio: user.bio || '',
        profile_pic_url: user.profile_pic_url || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dashRes, prRes, profileRes] = await Promise.all([
          analyticsAPI.getDashboard().catch(() => null),
          analyticsAPI.getPersonalRecords().catch(() => ({ data: [] })),
          authAPI.getProfile().catch(() => null),
        ]);
        if (dashRes) setStats(dashRes.data);
        setPersonalRecords(prRes.data || []);
        if (profileRes?.data) {
          updateUser(profileRes.data);
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      }
    };
    fetchStats();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const payload = {};
      if (form.name && form.name !== user?.name) payload.name = form.name;
      if (form.height_cm) payload.height_cm = parseFloat(form.height_cm);
      if (form.weight_kg) payload.weight_kg = parseFloat(form.weight_kg);
      if (form.fitness_goal) payload.fitness_goal = form.fitness_goal;
      if (form.date_of_birth) payload.date_of_birth = form.date_of_birth;
      if (form.gender) payload.gender = form.gender;
      if (form.bio !== undefined) payload.bio = form.bio || user?.bio || '';
      if (form.profile_pic_url) payload.profile_pic_url = form.profile_pic_url;

      if (Object.keys(payload).length > 0) {
        const res = await authAPI.updateProfile(payload);
        updateUser(res.data);
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setEditing(false);
        }, 1500);
      } else {
        setEditing(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwError('');
    setPwSuccess(false);
    try {
      await authAPI.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setPwSuccess(true);
      setTimeout(() => {
        setShowPwModal(false);
        setCurrentPw('');
        setNewPw('');
        setPwSuccess(false);
      }, 1200);
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const processPhotoUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoMessage({
        type: 'error',
        text: 'Please choose an image file (JPEG, PNG, WEBP, or GIF).',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoMessage({
        type: 'error',
        text: 'Image size exceeds 5MB limit. Please select a smaller photo.',
      });
      return;
    }

    setUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authAPI.uploadProfilePhoto(formData);
      updateUser(res.data);
      setForm((prev) => ({ ...prev, profile_pic_url: res.data.profile_pic_url }));
      setPhotoMessage({
        type: 'success',
        text: 'Profile photo updated successfully!',
      });
      setTimeout(() => setPhotoMessage(null), 3500);
    } catch (err) {
      console.error('Failed to upload profile photo:', err);
      setPhotoMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to upload photo. Please try again.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPhotoUpload(file);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const res = await authAPI.deleteProfilePhoto();
      updateUser(res.data);
      setForm((prev) => ({ ...prev, profile_pic_url: '' }));
      setPhotoMessage({ type: 'success', text: 'Profile photo removed.' });
      setTimeout(() => setPhotoMessage(null), 3500);
    } catch (err) {
      console.error('Failed to delete photo:', err);
      setPhotoMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to remove photo.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const formatRegistrationDate = (dateVal) => {
    if (!dateVal) return 'Recently joined';
    const str = String(dateVal).trim().replace(' ', 'T');
    const d = new Date(str);
    if (isNaN(d.getTime())) return 'Recently joined';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysActive = (dateVal) => {
    if (!dateVal) return null;
    const str = String(dateVal).trim().replace(' ', 'T');
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return Math.max(1, Math.ceil((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getAge = () => {
    if (!form.date_of_birth) return null;
    const dob = new Date(form.date_of_birth);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getBMI = () => {
    if (!form.height_cm || !form.weight_kg) return null;
    const h = parseFloat(form.height_cm) / 100;
    const w = parseFloat(form.weight_kg);
    if (h <= 0 || w <= 0) return null;
    return (w / (h * h)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: 'Underweight', color: 'text-amber-400' };
    if (val < 25) return { label: 'Normal', color: 'text-white' };
    if (val < 30) return { label: 'Overweight', color: 'text-amber-400' };
    return { label: 'Obese', color: 'text-red-400' };
  };

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const bmi = getBMI();
  const bmiCat = getBMICategory(bmi);
  const age = getAge();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-fadeIn">

      {/* ── Profile Header Card ── */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-white/10 bg-[#0d0e12]">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-rose-600/5 rounded-full blur-3xl pointer-events-none -ml-12 -mb-12"></div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* Avatar & Photo Upload Controls */}
            <div className="flex flex-col items-center gap-2.5 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />

              <div
                className={`relative group shrink-0 cursor-pointer ${dragOver ? 'scale-105' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                title="Click or drag & drop to upload new photo"
              >
                <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${
                  dragOver
                    ? 'border-red-500 ring-4 ring-red-500/30'
                    : 'border-white/10 group-hover:border-red-500/70 group-hover:shadow-red-600/20'
                }`}>
                  {form.profile_pic_url ? (
                    <img
                      src={getMediaUrl(form.profile_pic_url)}
                      alt={user?.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-600 via-rose-600 to-red-500 flex items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-black text-white">{initials}</span>
                    </div>
                  )}
                </div>

                {/* Hover / Uploading Overlay */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-black/60 backdrop-blur-[2px] transition-all duration-200 ${
                  uploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center gap-1.5 text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-red-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-white">
                      <Camera className="w-6 h-6 text-white" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                    </div>
                  )}
                </div>

                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-[#0d0e12] animate-pulse"></div>
              </div>

              {/* Action buttons below avatar */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-3 h-3 text-red-400" />
                  <span>Upload Photo</span>
                </button>

                {form.profile_pic_url && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-[11px] transition-all active:scale-95 disabled:opacity-50"
                    title="Remove Profile Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* User info + stats */}
            <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
              <div>
                {editing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="text-2xl sm:text-3xl font-extrabold text-white bg-transparent border-b-2 border-red-500/40 focus:border-red-500 outline-none w-full max-w-sm pb-1 transition-colors"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{user?.name || 'Athlete'}</h1>
                )}
                <p className="text-zinc-400 text-sm mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </p>
              </div>

              {/* Quick stat badges */}
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                {form.fitness_goal && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/15 text-red-400 border border-red-500/25">
                    <Target className="w-3 h-3" />
                    {form.fitness_goal}
                  </span>
                )}
                {age && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15">
                    <Calendar className="w-3 h-3" />
                    {age} years
                  </span>
                )}
                {form.gender && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-white/10">
                    {form.gender}
                  </span>
                )}
                {user?.created_at && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-zinc-300 border border-white/15">
                    <Calendar className="w-3 h-3 text-red-400" />
                    Member since {formatRegistrationDate(user.created_at)}
                  </span>
                )}
              </div>

              {/* Bio */}
              {editing ? (
                <textarea
                  value={form.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Write a short bio about yourself..."
                  maxLength={500}
                  rows={2}
                  className="w-full rounded-xl bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60 resize-none"
                />
              ) : form.bio ? (
                <p className="text-zinc-300 text-sm max-w-lg">{form.bio}</p>
              ) : null}
            </div>

            {/* Edit/Save button */}
            <div className="shrink-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(false); setError(''); }}
                    className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-all disabled:opacity-50"
                  >
                    {success ? (
                      <><Check className="w-4 h-4" /> Saved!</>
                    ) : loading ? (
                      'Saving...'
                    ) : (
                      <><Save className="w-4 h-4" /> Save</>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/30 text-zinc-200 font-semibold text-sm transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </button>
              )}
            </div>
          </div>

          {photoMessage && (
            <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              photoMessage.type === 'success'
                ? 'bg-red-600/10 border-red-500/30 text-red-300'
                : 'bg-rose-600/10 border-rose-500/30 text-rose-300'
            }`}>
              {photoMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{photoMessage.text}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Body Metrics Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Height */}
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2 group hover:border-red-500/30 transition-all bg-[#0d0e12]">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-red-600/15 text-red-400 group-hover:scale-110 transition-transform">
              <Ruler className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Height</span>
          </div>
          {editing ? (
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.1"
                min="50"
                max="300"
                value={form.height_cm}
                onChange={(e) => handleChange('height_cm', e.target.value)}
                placeholder="—"
                className="w-full bg-transparent text-2xl font-extrabold text-white outline-none border-b border-zinc-700 focus:border-red-500 pb-0.5 transition-colors"
              />
              <span className="text-xs text-zinc-500 shrink-0">cm</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white">{form.height_cm || '—'}</span>
              {form.height_cm && <span className="text-xs text-zinc-500">cm</span>}
            </div>
          )}
        </div>

        {/* Weight */}
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2 group hover:border-red-500/30 transition-all bg-[#0d0e12]">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-white/10 text-white group-hover:scale-110 transition-transform">
              <Weight className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Weight</span>
          </div>
          {editing ? (
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                step="0.1"
                min="20"
                max="500"
                value={form.weight_kg}
                onChange={(e) => handleChange('weight_kg', e.target.value)}
                placeholder="—"
                className="w-full bg-transparent text-2xl font-extrabold text-white outline-none border-b border-zinc-700 focus:border-red-500 pb-0.5 transition-colors"
              />
              <span className="text-xs text-zinc-500 shrink-0">kg</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white">{form.weight_kg || '—'}</span>
              {form.weight_kg && <span className="text-xs text-zinc-500">kg</span>}
            </div>
          )}
        </div>

        {/* BMI */}
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2 group hover:border-red-500/30 transition-all bg-[#0d0e12]">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-red-600/15 text-red-400 group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider">BMI</span>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-white">{bmi || '—'}</span>
            {bmiCat && (
              <span className={`block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${bmiCat.color}`}>
                {bmiCat.label}
              </span>
            )}
          </div>
        </div>

        {/* Age */}
        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2 group hover:border-red-500/30 transition-all bg-[#0d0e12]">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="p-1.5 rounded-lg bg-white/10 text-white group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider">Age</span>
          </div>
          {editing ? (
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-white outline-none border-b border-zinc-700 focus:border-red-500 pb-0.5 transition-colors [color-scheme:dark]"
            />
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white">{age || '—'}</span>
              {age && <span className="text-xs text-zinc-500">yrs</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Fitness Goal Selection ── */}
      {editing && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 bg-[#0d0e12]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            Fitness Goal
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {FITNESS_GOALS.map((goal) => {
              const Icon = goal.icon;
              const selected = form.fitness_goal === goal.value;
              const colorClasses = {
                red: selected ? 'border-red-500 bg-red-600/20 text-red-400' : 'border-zinc-800 text-zinc-400',
                rose: selected ? 'border-rose-500 bg-rose-600/20 text-rose-400' : 'border-zinc-800 text-zinc-400',
                amber: selected ? 'border-amber-500 bg-amber-500/15 text-amber-400' : 'border-zinc-800 text-zinc-400',
                blue: selected ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-zinc-800 text-zinc-400',
                purple: selected ? 'border-purple-500 bg-purple-500/15 text-purple-400' : 'border-zinc-800 text-zinc-400',
              };
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => handleChange('fitness_goal', goal.value)}
                  className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-95 ${colorClasses[goal.color] || ''} ${selected ? 'shadow-lg shadow-red-600/10' : 'hover:bg-white/5'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{goal.value}</span>
                  <span className="text-[10px] text-zinc-500 hidden sm:block">{goal.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Gender Selection (editing mode) ── */}
      {editing && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 space-y-3 bg-[#0d0e12]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-300" />
            Gender
          </h3>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleChange('gender', g)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                  form.gender === g
                    ? 'border-red-500 bg-red-600/15 text-red-400'
                    : 'border-zinc-800 text-zinc-400 hover:bg-white/5'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Fitness Stats Overview ── */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4 bg-[#0d0e12]">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-red-400" />
          Fitness Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-red-600/10 border border-red-500/20 text-center">
            <span className="text-[10px] uppercase font-extrabold text-red-400 block">Total Workouts</span>
            <span className="text-xl font-black text-white">{stats?.workouts_this_week || 0}</span>
            <span className="text-[10px] text-zinc-400 block">this week</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] uppercase font-extrabold text-zinc-300 block">Volume Today</span>
            <span className="text-xl font-black text-white">{(stats?.total_volume || 0).toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400 block">kg</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[10px] uppercase font-extrabold text-zinc-300 block">Water Today</span>
            <span className="text-xl font-black text-white">{(stats?.water_today_ml || 0).toLocaleString()}</span>
            <span className="text-[10px] text-zinc-400 block">ml</span>
          </div>
          <div className="p-3 rounded-xl bg-red-600/10 border border-red-500/20 text-center">
            <span className="text-[10px] uppercase font-extrabold text-red-400 block">PRs Set</span>
            <span className="text-xl font-black text-white">{personalRecords.length}</span>
            <span className="text-[10px] text-zinc-400 block">personal records</span>
          </div>
        </div>
      </div>

      {/* ── Account Settings ── */}
      <div className="glass-panel rounded-2xl border border-white/10 divide-y divide-white/5 bg-[#0d0e12]">
        <div className="p-5 sm:p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-zinc-400" />
            Account Settings
          </h3>
        </div>

        <button
          onClick={() => setShowPwModal(true)}
          className="w-full flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-600/10 text-red-400">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Change Password</span>
              <span className="text-xs text-zinc-500">Update your account password</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </button>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Email</span>
              <span className="text-xs text-zinc-500">{user?.email}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-red-400 uppercase px-2 py-0.5 rounded bg-red-600/10 border border-red-500/20">Verified</span>
        </div>

        <div className="flex items-center justify-between px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-red-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Member Since</span>
              <span className="text-xs text-zinc-400">
                {user?.created_at
                  ? `Registered on ${formatRegistrationDate(user.created_at)}`
                  : 'Recently registered'}
              </span>
            </div>
          </div>
          {user?.created_at && getDaysActive(user.created_at) && (
            <span className="text-[10px] font-bold text-red-400 uppercase px-2.5 py-1 rounded-full bg-red-600/10 border border-red-500/20">
              Day {getDaysActive(user.created_at)} Athlete
            </span>
          )}
        </div>
      </div>

      {/* ── Password Change Modal ── */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0d0e12] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600/15 text-red-400">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Change Password</h3>
              </div>
              <button onClick={() => { setShowPwModal(false); setPwError(''); }} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pwError && (
              <div className="mt-4 p-3 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {pwError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-white/15 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase block mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl bg-zinc-900 border border-white/15 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPwModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-all disabled:opacity-50"
                >
                  {pwSuccess ? <><Check className="w-4 h-4" /> Done!</> : pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
