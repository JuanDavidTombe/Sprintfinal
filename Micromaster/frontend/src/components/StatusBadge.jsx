import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const config = {
    optimal: { label: 'Óptimo', bg: 'bg-lime-400/20', border: 'border-lime-400/40', text: 'text-[#364900]', dot: 'bg-lime-500' },
    warning: { label: 'Próximo a vencer', bg: 'bg-amber-400/15', border: 'border-amber-400/30', text: 'text-amber-800', dot: 'bg-amber-500' },
    critical: { label: 'Crítico / Vencido', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-700', dot: 'bg-rose-500' },
    quarantined: { label: 'En Cuarentena', bg: 'bg-slate-200/80', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500' },
    rejected: { label: 'Rechazado', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-700', dot: 'bg-rose-500' },
    approved: { label: 'Aprobado', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-800', dot: 'bg-emerald-600' },
    rupture: { label: 'Quiebre de Stock', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-700', dot: 'bg-rose-500' },
    low: { label: 'Bajo mínimo', bg: 'bg-amber-400/15', border: 'border-amber-400/30', text: 'text-amber-800', dot: 'bg-amber-500' },
    ok: { label: 'Disponible', bg: 'bg-lime-400/20', border: 'border-lime-400/40', text: 'text-[#364900]', dot: 'bg-lime-500' },
    pending: { label: 'Pendiente', bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-500' },
    confirmed: { label: 'Confirmado', bg: 'bg-lime-400/20', border: 'border-lime-400/40', text: 'text-[#364900]', dot: 'bg-lime-500' },
    completed: { label: 'Completado', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-800', dot: 'bg-emerald-600' },
    in_progress: { label: 'En Proceso', bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-800', dot: 'bg-sky-500' },
    assigned: { label: 'Asignado', bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-800', dot: 'bg-sky-600' },
    in_transit: { label: 'En Tránsito', bg: 'bg-amber-400/15', border: 'border-amber-400/30', text: 'text-amber-800', dot: 'bg-amber-500' },
    delivered: { label: 'Entregado', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-800', dot: 'bg-emerald-600' },
    cancelled: { label: 'Cancelado', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-700', dot: 'bg-rose-500' },
    refunded: { label: 'Reembolsado', bg: 'bg-slate-200/80', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500' },
    draft: { label: 'Borrador', bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },

    Open: { label: 'Abierta', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-700', dot: 'bg-rose-500' },
    Resolved: { label: 'Resuelta', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-800', dot: 'bg-emerald-600' },

    live: { label: 'En vivo', bg: 'bg-lime-400/25', border: 'border-lime-400/50', text: 'text-[#364900]', dot: 'bg-lime-500 animate-ping' },
    weak: { label: 'Señal débil', bg: 'bg-amber-400/15', border: 'border-amber-400/30', text: 'text-amber-800', dot: 'bg-amber-500' },
    stale: { label: 'Sin señal', bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  };

  const c = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${c.bg} ${c.border} ${c.text} border px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight select-none ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
}
