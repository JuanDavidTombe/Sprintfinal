import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon, { MicroMasterLogo } from '../components/AppIcon';

export default function PendingApproval() {
  return (
    <div className="min-h-dvh bg-cream technical-grid flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-lg text-center animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xl">
          <div className="inline-flex justify-center mb-3">
            <MicroMasterLogo size={52} />
          </div>

          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
            <AppIcon name="hourglass-split" size={18} className="text-amber-500" />
            <span>Solicitud de Alta Operativa Registrada</span>
          </h1>

          <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tus datos fueron recibidos en la <strong className="text-slate-900">Torre de Control de MicroMaster</strong>. Por seguridad de planta y cadena de frío, el Administrador debe validar y activar tu rol antes del primer ingreso.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900">
              ESTADO: PENDIENTE DE AUTORIZACIÓN RBAC
            </span>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">¿Qué sucede ahora?</p>
            <p>1. El Administrador verá una alerta inmediata en su panel de Usuarios & Permisos.</p>
            <p>2. Al aprobar tu perfil, podrás iniciar sesión con tu correo y contraseña en Web y App Móvil.</p>
          </div>

          <Link
            to="/login"
            className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-lime-400 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider btn-press transition-colors"
          >
            <AppIcon name="arrow-left" size={15} />
            <span>Volver al Inicio de Sesión</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
