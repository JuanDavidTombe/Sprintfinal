import React from 'react';
import AppIcon from './AppIcon';

export default function DynamicTable({
  columns = [],
  data = [],
  renderRow,
  rowClassName,
  className = '',
  emptyMessage = 'No se encontraron registros para mostrar.',
  emptyIcon = 'inbox',
  loading = false,
}) {
  const rows = Array.isArray(data) ? data : [];

  return (
    <div className={`bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs ${className}`}>
      <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full text-left border-collapse sm:min-w-full">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
              {columns.map((col) => (
                <th
                  key={col.key || col.label}
                  className={`px-3 md:px-4 py-2.5 md:py-3 text-[10px] md:text-[11px] uppercase tracking-[0.14em] font-bold whitespace-nowrap ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-lime-400 border-t-slate-900 rounded-full animate-spin" />
                    <span className="text-xs font-medium">Cargando registros...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <AppIcon name={emptyIcon} className={`-${emptyIcon} text-3xl text-slate-300`}  aria-hidden="true" />
                    <p className="text-xs font-semibold text-slate-600">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`hover:bg-slate-50/70 transition-colors ${rowClassName ? rowClassName(row, idx) : ''}`}
                >
                  {renderRow(row, idx)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
