import React, { useEffect } from 'react';
import AppIcon from './AppIcon';

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/65 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-2xl md:rounded-3xl shadow-2xl ${maxWidth} w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80 animate-slide-up`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 shrink-0 bg-white">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate pr-3">{title}</h3>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 flex items-center justify-center text-slate-500 hover:text-slate-800 btn-press transition-colors"
            title="Cerrar modal (Esc)"
            aria-label="Cerrar modal"
          >
            <AppIcon name="x-lg" size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 sm:gap-3 shrink-0 bg-slate-50/70">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
