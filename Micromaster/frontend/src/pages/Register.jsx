import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { REGISTRABLE_ROLES } from '../constants/roles';
import AppIcon, { MicroMasterLogo } from '../components/AppIcon';

const EMPTY = {
  name: '',
  identity_document: '',
  email: '',
  phone: '',
  role: 'OPERARIO_LOGISTICO',
  password: '',
  password_confirmation: '',
};

const FIELD =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 focus:ring-2 focus:ring-lime-400 focus:border-slate-900 outline-none transition-colors';
const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block';

const ROLE_ICONS = {
  OPERARIO_LOGISTICO: 'box-seam-fill',
  COCINERO_PRODUCCION: 'fire',
  CONTADOR: 'calculator-fill',
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Control de registro y roles: envia los datos del nuevo usuario a la ruta /api/auth/register; la cuenta queda en estado PENDING hasta que el administrador la apruebe
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.password_confirmation) {
      setError('La contraseña y su confirmación no coinciden');
      setLoading(false);
      return;
    }

    try {
      await auth.register(form);
      navigate('/pending-approval', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.errors
          ? Object.values(data.errors).flat().join(' · ')
          : data?.message || 'No se pudo enviar la solicitud de registro'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-cream technical-grid flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-7 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <MicroMasterLogo size={42} />
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                Alta de Personal Operativo · MICRO<span className="text-[#4F6B00]">MASTER</span>
              </h1>
              <p className="text-xs text-slate-500">
                Solicitud de credenciales para Planta, Bodega Fría o Contabilidad
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="self-start sm:self-auto text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl btn-press transition-colors"
          >
            ← Volver al Login
          </Link>
        </div>

        <div className="flex items-center gap-2.5 my-3.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900">
          <AppIcon name="shield-exclamation" size={16} className="text-amber-600 shrink-0" />
          <p className="leading-snug">
            Por protocolo de seguridad alimentaria y RBAC, toda cuenta nueva queda en estado{' '}
            <strong>PENDIENTE</strong> hasta que el <strong>Administrador de Planta</strong> la autorice en su panel.
          </p>
        </div>

        {error && (
          <div className="mb-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className={LABEL}>Selecciona tu Área Operativa</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {REGISTRABLE_ROLES.map((r) => {
                const active = form.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                    className={`p-2.5 rounded-xl border text-left btn-press transition-colors ${
                      active
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-extrabold truncate">{r.label}</span>
                      <AppIcon
                        name={ROLE_ICONS[r.value] || 'person'}
                        size={14}
                        className={active ? 'text-lime-400' : 'text-slate-500'}
                      />
                    </div>
                    <p
                      className={`text-[10px] leading-tight mt-1 line-clamp-2 ${
                        active ? 'text-white/70' : 'text-slate-500'
                      }`}
                    >
                      {r.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Nombre Completo</label>
              <input
                type="text"
                className={FIELD}
                placeholder="Ej: Carlos Andrés Gómez"
                value={form.name}
                onChange={set('name')}
                required
                maxLength={120}
              />
            </div>
            <div>
              <label className={LABEL}>Documento de Identidad (CC / NIT)</label>
              <input
                type="text"
                className={FIELD}
                placeholder="Ej: CC 1.061.789.234"
                value={form.identity_document}
                onChange={set('identity_document')}
                required
                maxLength={40}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Correo Electrónico Corporativo</label>
              <input
                type="email"
                className={FIELD}
                placeholder="operario@micromaster.com"
                value={form.email}
                onChange={set('email')}
                autoCapitalize="none"
                autoCorrect="off"
                required
                maxLength={150}
              />
            </div>
            <div>
              <label className={LABEL}>Celular / WhatsApp de Turno</label>
              <input
                type="tel"
                className={FIELD}
                placeholder="+57 315 000 0000"
                value={form.phone}
                onChange={set('phone')}
                required
                maxLength={40}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Contraseña (Mín. 6 caracteres)</label>
              <input
                type="password"
                className={FIELD}
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className={LABEL}>Confirmar Contraseña</label>
              <input
                type="password"
                className={FIELD}
                placeholder="••••••••"
                value={form.password_confirmation}
                onChange={set('password_confirmation')}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-400 hover:bg-lime-500 disabled:opacity-40 text-slate-900 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider btn-press transition-colors shadow-xs"
          >
            {loading ? 'REGISTRANDO SOLICITUD...' : 'ENVIAR SOLICITUD DE ALTA OPERATIVA'}
          </button>
        </form>
      </div>
    </div>
  );
}
