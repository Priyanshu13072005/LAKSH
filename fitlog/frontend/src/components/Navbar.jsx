import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  LayoutDashboard, 
  Flame, 
  BookOpen, 
  Droplets, 
  Footprints, 
  BarChart3, 
  LogOut, 
  User, 
  Timer, 
  Menu, 
  X,
  Target,
  Trophy,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { workoutAPI, getMediaUrl } from '../services/api';

export default function Navbar({ onOpenGoalModal }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState(null);

  // Poll for active workout session status every 15 seconds
  useEffect(() => {
    let isMounted = true;
    const checkActive = async () => {
      try {
        const res = await workoutAPI.getActiveWorkout();
        if (isMounted) {
          setActiveWorkout(res.data);
        }
      } catch (err) {
        if (isMounted) setActiveWorkout(null);
      }
    };

    checkActive();
    const interval = setInterval(checkActive, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Workouts', path: '/workouts', icon: Dumbbell },
    { name: 'PRs', path: '/records', icon: Trophy },
    { name: 'Exercises', path: '/exercises', icon: BookOpen },
    { name: 'Routines', path: '/templates', icon: Layers },
    { name: 'Hydration', path: '/hydration', icon: Droplets },
    { name: 'Steps', path: '/activity', icon: Footprints },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // User initials for avatar
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/10 bg-[#08080a]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform duration-200">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 font-bold" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-red-100 to-rose-400">
                  LAKSH
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 tracking-widest -mt-1 hidden xs:block">
                  Fitness & Gym Tracker
                </span>
              </div>
            </Link>

            {/* Live active workout banner */}
            {activeWorkout && (
              <Link
                to="/workouts/active"
                className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold animate-pulse hover:bg-red-500/25 transition-colors ml-4"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <Timer className="w-3.5 h-3.5" />
                <span>Workout In Progress</span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-red-600/15 text-red-400 border border-red-500/30 shadow-sm shadow-red-500/10'
                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-zinc-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User & Actions (Desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            {onOpenGoalModal && (
              <button
                onClick={onOpenGoalModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-200 transition-colors"
                title="Adjust Daily Goals"
              >
                <Target className="w-3.5 h-3.5 text-red-400" />
                Goals
              </button>
            )}

            {/* Profile avatar link */}
            <Link
              to="/profile"
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform text-white">
                {user?.profile_pic_url ? (
                  <img src={getMediaUrl(user.profile_pic_url)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black">{initials}</span>
                )}
              </div>
              <span className="font-bold text-xs text-zinc-200 group-hover:text-white transition-colors">{user?.name || 'Athlete'}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile right section */}
          <div className="flex lg:hidden items-center gap-2">
            {activeWorkout && (
              <Link
                to="/workouts/active"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Live</span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-zinc-300 hover:bg-white/5 active:scale-90 transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-white/10 bg-[#08080a]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
                  isActive
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Profile + Goals in drawer */}
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
              location.pathname === '/profile'
                ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-5 h-5" />
            My Profile
          </Link>

          {onOpenGoalModal && (
            <button
              onClick={() => { onOpenGoalModal(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-all active:scale-[0.97] w-full"
            >
              <Target className="w-5 h-5 text-red-400" />
              Set Daily Goals
            </button>
          )}

          <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center text-white">
                {user?.profile_pic_url ? (
                  <img src={getMediaUrl(user.profile_pic_url)} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black">{initials}</span>
                )}
              </div>
              <div>
                <span className="text-sm font-bold text-white block">{user?.name}</span>
                <span className="text-[10px] text-zinc-400">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl bg-rose-500/10 active:scale-90 transition-all font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
