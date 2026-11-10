import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/api';
import AppIcon, { MicroMasterLogo } from '../components/AppIcon';

const QUICK_ROLES = [
  {
    label: 'Administrador',
    sub: 'Torre Control · RBAC',
    email: 'admin@micromaster.com',
    pass: 'admin123',
    icon: 'shield-lock-fill',
  },
  {
    label: 'Logística & Frío',
    sub: 'Muelle ASN · Picking FEFO',
    email: 'logistica@micromaster.com',
    pass: 'logistica123',
    icon: 'box-seam-fill',
  },
  {
    label: 'Jefe Producción',
    sub: 'Fórmulas BOM · Mermas',
    email: 'produccion@micromaster.com',
    pass: 'produccion123',
    icon: 'fire',
  },
  {
    label: 'Contabilidad',
    sub: 'Costos COP · Conciliación',
    email: 'contabilidad@micromaster.com',
    pass: 'contabilidad123',
    icon: 'calculator-fill',
  },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Control de registro y roles: envia el correo y la contrasena a la ruta /api/auth/login; si el backend valida el usuario devuelve el token y el JSON del perfil
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await auth.login(email, password);
      localStorage.setItem('micromaster_token', res.data.token);
      localStorage.setItem('micromaster_user', JSON.stringify(res.data.user));
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      const data = err.response?.data;
      const status = data?.status;

      if (status === 'PENDING' || status === 'REJECTED') {
        setNotice(data?.error || 'Tu cuenta aún no está habilitada por el Administrador.');
      } else {
        setError(data?.error || data?.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
      }
    }
    setLoading(false);
  };

  const fillCredentials = (roleItem) => {
    setEmail(roleItem.email);
    setPassword(roleItem.pass);
    setError('');
    setNotice('');
  };

  // Control de vistas: renderiza el panel de acceso rapido por roles y el formulario de inicio de sesion
  return (
    <div className="min-h-dvh bg-cream technical-grid flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-fade-in">
        <div className="lg:col-span-5 bg-slate-900 text-white p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <MicroMasterLogo size={42} />
                <div>
                  <h1 className="text-lg font-black tracking-tight leading-none">
                    MICRO<span className="text-lime-400">MASTER</span>
                  </h1>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 block mt-0.5">
                    Food ERP & Cold Chain
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-lime-400/15 border border-lime-400/30 text-lime-400 text-[10px] font-mono font-bold">
                BPM · INVIMA
              </span>
            </div>

            <div className="mt-6 space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-white">
                Control de Planta Alimenticia, Lotes FEFO y Distribución B2B.
              </h2>
              <p className="text-xs text-white/65 leading-relaxed">
                Trazabilidad desde el muelle de recepción (ASN/Factura), escandallo de recetas industriales y control de mermas hasta la entrega refrigerada con recaudo OTP.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-1.5 text-lime-400 text-xs font-mono font-bold">
                  <AppIcon name="snow2" size={14} />
                  <span>≤ 4.0°C Cava</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Monitoreo térmico en recepción y ruta</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-1.5 text-lime-400 text-xs font-mono font-bold">
                  <AppIcon name="qr-code-scan" size={14} />
                  <span>100% FEFO</span>
                </div>
                <p className="text-[10px] text-white/50 mt-0.5">Rotación estricta por vencimiento</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
            <span>PLANTA CENTRAL · COLOMBIA (COP)</span>
            <span>v2.5 OPERATE</span>
          </div>
        </div>

        <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Ingreso de Personal Autorizado</h2>
                <p className="text-xs text-slate-500">Autenticación por rol operativo RBAC</p>
              </div>
              <Link
                to="/register"
                className="text-xs font-bold text-[#3E5500] bg-lime-400/25 hover:bg-lime-400/40 px-3 py-1.5 rounded-xl btn-press transition-colors"
              >
                + Solicitar Acceso
              </Link>
            </div>

            {error && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-center gap-2">
                <AppIcon name="exclamation-octagon-fill" size={15} className="text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-medium text-amber-900 flex items-center gap-2">
                <AppIcon name="hourglass-split" size={15} className="text-amber-600 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Correo Corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 focus:ring-2 focus:ring-lime-400 focus:border-slate-900 outline-none transition-colors"
                  placeholder="operador@micromaster.com"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 block">
                  Contraseña de Turno
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 focus:ring-2 focus:ring-lime-400 focus:border-slate-900 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-lime-400 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider btn-press transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <AppIcon name="box-arrow-in-right" size={15} />
                {loading ? 'VERIFICANDO CREDENCIALES...' : 'INGRESAR A PLANTA'}
              </button>
            </form>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Perfiles Operativos de Acceso Rápido (1-Clic)
              </span>
              <span className="text-[10px] font-mono text-slate-400"> Autocompletar </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {QUICK_ROLES.map((item) => {
                const selected = email === item.email;
                return (
                  <button
                    key={item.email}
                    type="button"
                    onClick={() => fillCredentials(item)}
                    className={`p-2 rounded-xl border text-left btn-press transition-colors ${
                      selected
                        ? 'bg-lime-400/25 border-slate-900 text-slate-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AppIcon name={item.icon} size={13} className="text-slate-900" />
                      <span className="text-[11px] font-bold truncate">{item.label}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">{item.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
