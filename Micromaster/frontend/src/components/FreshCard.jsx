import React from 'react';
import AppIcon from './AppIcon';

export default function FreshCard({ title, value, subtitle, actionLabel, icon, color = 'lime', className = '', onClick }) {
  const colorMap = {
    lime: {
      surface: 'bg-white border-slate-200/90 hover:border-slate-300',
      accentBar: 'bg-[#4D6A00]',
      valueText: 'text-slate-900',
      iconColor: 'text-[#4D6A00]',
      badgeBg: 'bg-lime-400/20 border-lime-500/30 text-[#3E5500]',
    },
    terracotta: {
      surface: 'bg-white border-rose-200/90 hover:border-rose-300',
      accentBar: 'bg-rose-600',
      valueText: 'text-rose-700',
      iconColor: 'text-rose-600',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
    },
    slate: {
      surface: 'bg-slate-900 border-slate-800 hover:border-slate-700',
      accentBar: 'bg-lime-400',
      valueText: 'text-white',
      iconColor: 'text-lime-400',
      badgeBg: 'bg-white/10 border-white/15 text-lime-400',
    },
    cream: {
      surface: 'bg-white border-slate-200/90 hover:border-slate-300',
      accentBar: 'bg-slate-400',
      valueText: 'text-slate-900',
      iconColor: 'text-slate-600',
      badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
    },
  };

  const c = colorMap[color] || colorMap.lime;
  const isClickable = Boolean(onClick);
  const isSlate = color === 'slate';

  return (
    <div
      onClick={onClick}
      onKeyDown={isClickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`${c.surface} border rounded-2xl p-3.5 md:p-4 card-hover flex flex-col justify-between shadow-2xs select-none relative overflow-hidden transition-all ${
        isClickable ? 'cursor-pointer hover:shadow-md active:scale-[0.99] ring-offset-1 focus:outline-none focus:ring-2 focus:ring-rose-500/40' : ''
      } ${className}`}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${c.accentBar}`} />

      <div className="pl-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p
            className={`text-[10px] md:text-[11px] uppercase tracking-[0.12em] font-bold truncate ${
              isSlate ? 'text-white/60' : 'text-slate-500'
            }`}
            title={title}
          >
            {title}
          </p>
          {icon && (
            <span className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${c.badgeBg}`}>
              <AppIcon name={icon} size={13} strokeWidth={2} />
            </span>
          )}
        </div>

        <p
          className={`text-xl md:text-2xl font-extrabold truncate leading-tight tracking-tight font-mono tabular-data ${c.valueText}`}
          title={String(value)}
        >
          {value}
        </p>

        <div className="flex items-center justify-between gap-2 mt-1">
          {subtitle && (
            <p
              className={`text-[11px] font-medium truncate ${
                isSlate ? 'text-white/50' : 'text-slate-500'
              }`}
              title={subtitle}
            >
              {subtitle}
            </p>
          )}
          {actionLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs shrink-0">
              {actionLabel}
              <AppIcon name="arrow-right" size={10} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
