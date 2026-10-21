import React from 'react';

const colorThemes = {
  red: {
    bg: 'from-red-600/15 via-rose-600/5 to-transparent',
    border: 'border-red-500/25 hover:border-red-500/50',
    iconBg: 'bg-red-500/20 text-red-400',
    glow: 'hover:shadow-red-500/20',
    bar: 'bg-gradient-to-r from-red-600 to-rose-500',
    text: 'text-red-400',
  },
  emerald: {
    bg: 'from-red-600/15 via-rose-600/5 to-transparent',
    border: 'border-red-500/25 hover:border-red-500/50',
    iconBg: 'bg-red-500/20 text-red-400',
    glow: 'hover:shadow-red-500/20',
    bar: 'bg-gradient-to-r from-red-600 to-rose-500',
    text: 'text-red-400',
  },
  blue: {
    bg: 'from-blue-500/10 to-indigo-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    iconBg: 'bg-blue-500/15 text-blue-400',
    glow: 'hover:shadow-blue-500/10',
    bar: 'bg-gradient-to-r from-blue-500 to-indigo-400',
    text: 'text-blue-400',
  },
  white: {
    bg: 'from-white/10 to-white/5',
    border: 'border-white/20 hover:border-white/40',
    iconBg: 'bg-white/15 text-white',
    glow: 'hover:shadow-white/10',
    bar: 'bg-gradient-to-r from-white to-zinc-300',
    text: 'text-white',
  },
  amber: {
    bg: 'from-amber-500/10 to-orange-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    iconBg: 'bg-amber-500/15 text-amber-400',
    glow: 'hover:shadow-amber-500/10',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
    text: 'text-amber-400',
  },
  purple: {
    bg: 'from-purple-500/10 to-fuchsia-500/5',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    iconBg: 'bg-purple-500/15 text-purple-400',
    glow: 'hover:shadow-purple-500/10',
    bar: 'bg-gradient-to-r from-purple-500 to-fuchsia-400',
    text: 'text-purple-400',
  },
};

export default function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color = 'red',
  progress,
  onClick,
}) {
  const theme = colorThemes[color] || colorThemes.red;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.bg} border ${theme.border} p-5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl ${theme.glow} ${
        onClick ? 'cursor-pointer hover:-translate-y-1' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-zinc-400">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {value}
            </span>
            {unit && <span className="text-sm font-semibold text-zinc-400">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-2xl ${theme.iconBg} shadow-inner`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs font-bold text-zinc-400 mb-1.5">
            <span>Progress</span>
            <span className={theme.text}>{Math.min(Math.round(progress), 100)}%</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {subtitle && (
        <p className="mt-3 text-xs text-zinc-400 flex items-center gap-1 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
