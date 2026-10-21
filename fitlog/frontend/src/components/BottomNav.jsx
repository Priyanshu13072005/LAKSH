import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Dumbbell,
  Droplets,
  BarChart3,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMediaUrl } from '../services/api';

const bottomNavItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Workouts', path: '/workouts', icon: Dumbbell },
  { name: 'Hydration', path: '/hydration', icon: Droplets },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Profile', path: '/profile', icon: User },
];

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#08080a]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-2xl transition-all duration-200 active:scale-90 min-w-[56px] ${
                isActive
                  ? 'text-red-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-500 shadow-lg shadow-red-500/40"></div>
              )}
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-red-600/15 scale-110' : ''}`}>
                {item.path === '/profile' && user?.profile_pic_url ? (
                  <img
                    src={getMediaUrl(user.profile_pic_url)}
                    alt="Profile"
                    className={`w-5 h-5 rounded-full object-cover border ${isActive ? 'border-red-400' : 'border-zinc-700'}`}
                  />
                ) : (
                  <Icon className={`w-5 h-5 transition-all ${isActive ? 'stroke-[2.5] text-red-400' : ''}`} />
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide transition-all ${isActive ? 'text-red-400' : 'text-zinc-500'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
