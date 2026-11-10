import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import UserProfileModal from './UserProfileModal';
import AppIcon from './AppIcon';

const ROUTE_TITLES = {
  '/': { section: 'Torre de Control', title: 'Estado Operativo de Planta & Cadena de Frío', badge: 'PLANTA ACTIVA' },
  '/stock': { section: 'Inventario & Stock', title: 'Control Maestro de Insumos & Lotes FEFO', badge: 'CADENA DE FRÍO' },
  '/stock/entradas': { section: 'Inventario & Stock', title: 'Recepción por Excepción (Cruce ASN / Factura)', badge: 'MUELLE BPM' },
  '/stock/qr': { section: 'Inventario & Stock', title: 'Etiquetado Térmico QR & Trazabilidad INVIMA', badge: 'TRAZABILIDAD' },
  '/stock/alertas': { section: 'Inventario & Stock', title: 'Matriz de Alertas FEFO & Punto de Reorden', badge: 'ALERTAS' },
  '/cost': { section: 'Recetas & Producción', title: 'Fórmulas Maestro BOM & Costeo Estándar', badge: 'INGENIERÍA BOM' },
  '/cost/recetas': { section: 'Recetas & Producción', title: 'Fórmulas Maestro BOM & Costeo Estándar', badge: 'INGENIERÍA BOM' },
  '/cost/tandas': { section: 'Recetas & Producción', title: 'Programación de Tandas & Reserva FEFO', badge: 'COCINA INDUSTRIAL' },
  '/cost/cierre': { section: 'Recetas & Producción', title: 'Cierre de Producción & Rendimiento Real', badge: 'CONTROL CALIDAD' },
  '/cost/mermas': { section: 'Recetas & Producción', title: 'Bitácora de Mermas & Desperdicio Operativo', badge: 'AUDITORÍA MERMAS' },
  '/cost/simulador': { section: 'Recetas & Producción', title: 'Simulador Financiero de Escandallo & Margen', badge: 'FINANZAS' },
  '/cost/insumos': { section: 'Recetas & Producción', title: 'Catálogo Maestro de Materias Primas', badge: 'CATÁLOGO' },
  '/orders': { section: 'Pedidos & Entregas', title: 'Bandeja de Consolidación B2B & Liberación a Picking', badge: 'DESPACHO B2B' },
  '/delivery': { section: 'Pedidos & Entregas', title: 'Monitoreo GPS de Flota & Hoja de Ruta B2B', badge: 'DESPACHO & GPS' },
  '/delivery/cobro': { section: 'Pedidos & Entregas', title: 'Recaudo en Punto (POD) & Validación OTP', badge: 'TESORERÍA RUTA' },
  '/delivery/incidencias': { section: 'Pedidos & Entregas', title: 'Novedades de Entrega & Devoluciones en Ruta', badge: 'POST-VENTA' },
  '/reports': { section: 'Reportes & Finanzas', title: 'Estado de Resultados, Costos & Conciliación Bancaria', badge: 'CONTABILIDAD' },
  '/reports/ventas': { section: 'Reportes & Finanzas', title: 'Auditoría de Ventas B2B & Margen Bruto', badge: 'VENTAS' },
  '/reports/pedidos': { section: 'Reportes & Finanzas', title: 'Cumplimiento OTIF & Nivel de Servicio Logístico', badge: 'OTIF' },
  '/reports/inventario': { section: 'Reportes & Finanzas', title: 'Valorización de Inventario & Rotación FEFO', badge: 'VALORIZACIÓN' },
  '/reports/exportar': { section: 'Reportes & Finanzas', title: 'Exportación Contable & Certificados de Lote', badge: 'ERP EXPORT' },
  '/settings': { section: 'Administración', title: 'Gobierno de Accesos RBAC & Aprobación de Operarios', badge: 'SEGURIDAD' },
  '/settings/config': { section: 'Administración', title: 'Parámetros de Planta, NIT & Cadena de Frío', badge: 'CONFIGURACIÓN' },
};

export default function Topbar({ user, onMenuToggle, onProfileUpdated }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const roleLabel = user?.role_label || 'Usuario';
  const currentMeta = ROUTE_TITLES[location.pathname] || ROUTE_TITLES['/'];

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e) => e.key === 'Escape' && setProfileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [profileOpen]);

  return (
    <>
      <header className="bg-slate-900 text-white px-3 md:px-5 py-2 flex items-center justify-between gap-2 shrink-0 sticky top-0 z-40 border-b border-white/10 shadow-xs pt-safe">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden shrink-0 w-9 h-9 -ml-0.5 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 btn-press text-white/80 hover:text-white transition-colors"
            title="Abrir Menú Lateral"
            aria-label="Abrir menú"
          >
            <AppIcon name="list" size={18} />
          </button>

          <div className="min-w-0 flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-lime-400/15 border border-lime-400/30 text-lime-400 text-[10px] font-mono font-bold tracking-wider shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
              {currentMeta.badge}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/45 font-bold leading-none">
                <span className="truncate">{currentMeta.section}</span>
                <span className="hidden md:inline text-white/20">/</span>
                <span className="hidden md:inline font-mono text-emerald-400">BPM · FRÍO ≤ 4.0°C</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-white truncate leading-tight mt-0.5">
                {currentMeta.title}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[10px] font-mono text-white/70">
            <AppIcon name="snow2" size={13} className="text-sky-400" />
            <span>Cava Principal: <strong className="text-white tabular-data">2.4°C</strong></span>
            <span className="text-white/20">|</span>
            <AppIcon name="shield-check" size={13} className="text-lime-400" />
            <span>FEFO Activo</span>
          </div>

          <span
            title="Rol oficial asignado en la matriz RBAC"
            className="hidden sm:inline-block text-[10px] bg-white/5 border border-white/10 text-lime-400 px-2.5 py-1 rounded-xl font-mono font-semibold truncate max-w-[9rem] md:max-w-none select-none"
          >
            {roleLabel}
          </span>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            title="Ver mi perfil"
            aria-label="Abrir mi perfil de usuario"
            className="group flex items-center gap-2 rounded-xl pl-1 pr-1 md:pr-2.5 py-1 bg-white/5 hover:bg-white/10 active:scale-95 btn-press border border-white/10 transition-colors"
          >
            <span className="w-7 h-7 shrink-0 bg-slate-800 border border-lime-400/40 text-lime-400 rounded-lg flex items-center justify-center text-xs font-mono font-black shadow-xs">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <span className="hidden md:block text-left min-w-0 max-w-[9.5rem]">
              <span className="block text-[11px] font-bold text-white truncate leading-tight">
                {user?.name ? user.name.replace(/Palehor/gi, 'Palechor') : 'Usuario'}
              </span>
              <span className="block text-[9px] text-lime-400/90 uppercase tracking-widest truncate leading-tight">
                Perfil · Turno Activo
              </span>
            </span>
          </button>
        </div>
      </header>

      <UserProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onProfileUpdated={(p) => onProfileUpdated && onProfileUpdated(p)}
      />
    </>
  );
}
