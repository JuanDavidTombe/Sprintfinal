import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '../services/api';
import FreshCard from '../components/FreshCard';
import AppIcon from '../components/AppIcon';
import { hasModuleAccess } from '../constants/roles';
import { formatHumanDate } from '../utils/dateFormatter';
import { formatCOP } from '../utils/currencyFormatter';

const TABS = [
  { id: 'resumen', label: 'Vista Integral Planta', icon: 'grid-1x2-fill' },
  { id: 'inventario', label: 'Cava Fría & FEFO', icon: 'box-seam-fill' },
  { id: 'logistica', label: 'Despacho B2B & Flota', icon: 'truck' },
  { id: 'finanzas', label: 'Finanzas & Mermas', icon: 'graph-up-arrow' },
];

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');
  const role = user?.role || 'ADMINISTRADOR';

  // Comunicacion de peticiones (Dashboard): llama a la ruta /api/dashboard y guarda el JSON de respuesta para pintar las tarjetas y alertas
  const loadDashboard = () => {
    setLoading(true);
    dashboard
      .getKpis()
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-9 h-9 border-3 border-lime-400/30 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const fefoMatrix = data?.fefo_matrix || [];
  const alerts = data?.alerts || {};
  const expiring = alerts.expiring_this_week || [];
  const pendingUsers = data?.pending_users || [];
  const pendingUsersCount = kpis.pending_users_count ?? pendingUsers.length;

  const criticalCount = kpis.critical_batches || 0;
  const warningCount = kpis.warning_batches || expiring.filter((b) => b.status === 'warning').length || 0;
  const optimalCount = kpis.optimal_batches || 0;
  const totalBatches = Math.max(1, criticalCount + warningCount + optimalCount);

  const totalRevenue = Number(kpis.total_revenue || 0);
  const totalCollected = Number(kpis.total_collected || 0);
  const collectionRate = totalRevenue > 0 ? Math.min(100, Math.round((totalCollected / totalRevenue) * 100)) : 0;

  return (
    <div className="space-y-3.5 animate-fade-in">
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-lime-400/35 text-lime-400 flex items-center justify-center shrink-0">
            <AppIcon name="activity" size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                Torre de Control · Planta Alimenticia & Frío
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-lime-400/15 border border-lime-400/30 text-lime-400 text-[10px] font-mono font-bold">
                TURNO ACTIVO
              </span>
            </div>
            <p className="text-xs text-white/60 truncate mt-0.5">
              Operador en sesión: <strong className="text-white">{user?.name?.replace(/Palehor/gi, 'Palechor')}</strong> · Normativa INVIMA BPM & Rotación FEFO
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {hasModuleAccess(role, 'inventory_stock') && (
            <Link
              to="/stock/entradas"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 btn-press transition-colors"
            >
              <AppIcon name="truck-flatbed" size={14} className="text-lime-400" />
              <span>Recepción ASN</span>
            </Link>
          )}
          {hasModuleAccess(role, 'recipes_production') && (
            <Link
              to="/cost/tandas"
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 btn-press transition-colors"
            >
              <AppIcon name="fire" size={14} className="text-lime-400" />
              <span>Tandas BOM</span>
            </Link>
          )}
          {hasModuleAccess(role, 'orders_delivery') && (
            <Link
              to="/orders"
              className="px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-slate-900 text-xs font-extrabold flex items-center gap-1.5 btn-press transition-colors shadow-xs"
            >
              <AppIcon name="box-seam-fill" size={14} />
              <span>Consolidar Picking B2B</span>
            </Link>
          )}
          <button
            type="button"
            onClick={loadDashboard}
            title="Actualizar telemetría"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center btn-press transition-colors"
          >
            <AppIcon name="arrow-clockwise" size={14} />
          </button>
        </div>
      </div>

      {role === 'ADMINISTRADOR' && pendingUsersCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-slate-900 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/25 border border-amber-400 text-amber-900 flex items-center justify-center shrink-0">
              <AppIcon name="person-fill-exclamation" size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                  {pendingUsersCount === 1
                    ? '1 Solicitud de Alta Operativa Pendiente de Autorización'
                    : `${pendingUsersCount} Solicitudes de Alta Operativa Pendientes de Autorización`}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-400 text-slate-900">
                  CONTROL RBAC
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                {pendingUsers[0] ? (
                  <>
                    <strong className="font-bold">{pendingUsers[0].name}</strong> ({pendingUsers[0].email}) solicitó acceso como{' '}
                    <strong>{pendingUsers[0].role_label || pendingUsers[0].role}</strong>.
                  </>
                ) : (
                  'Personal registrado esperando habilitación de credenciales para turno.'
                )}
              </p>
            </div>
          </div>
          <Link
            to="/settings?tab=pending"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-lime-400 text-xs font-extrabold transition-colors shrink-0 flex items-center gap-1.5 justify-center btn-press"
          >
            <AppIcon name="check2-circle" size={14} />
            <span>Autorizar Personal →</span>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <FreshCard
          title="Stock en Cava & Secos"
          value={`${kpis.total_inventory_kg || 0} kg`}
          subtitle={`Valorizado: ${formatCOP(kpis.total_inventory_value || 0, true)}`}
          icon="box-seam"
          color="lime"
        />
        <FreshCard
          title="Lotes Frescos (FEFO)"
          value={optimalCount}
          subtitle={`${Math.round((optimalCount / totalBatches) * 100)}% del inventario total`}
          icon="shield-check"
          color="lime"
        />
        <FreshCard
          title="Riesgo Vencimiento"
          value={criticalCount + warningCount}
          subtitle={`${criticalCount} críticos · ${warningCount} preventivos`}
          icon="exclamation-triangle"
          color={criticalCount > 0 ? 'terracotta' : 'lime'}
        />
        <FreshCard
          title="Despachos B2B"
          value={kpis.completed_orders || 0}
          subtitle={`En ruta: ${kpis.in_transit_orders || 0} · Pendientes: ${kpis.pending_orders || 0}`}
          icon="truck"
          color="lime"
        />
      </div>

      <div className="no-scrollbar flex flex-nowrap gap-1.5 items-center overflow-x-auto py-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 btn-press transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-900 text-lime-400 shadow-xs'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <AppIcon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {(activeTab === 'resumen' || activeTab === 'inventario') && (
          <div className={`${activeTab === 'inventario' ? 'lg:col-span-12' : 'lg:col-span-5'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                    CONTROL DE CADUCIDAD INVIMA
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Matriz FEFO & Lotes con Salida Prioritaria
                  </h2>
                </div>
                <Link
                  to="/stock"
                  className="text-xs font-bold text-[#3E5500] hover:underline shrink-0"
                >
                  Ver Stock →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                {fefoMatrix.map((item) => (
                  <div
                    key={item.type}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[11px] font-bold text-slate-700 truncate">{item.type}</span>
                    </div>
                    <span className="text-sm font-black font-mono text-slate-900 tabular-data ml-1">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 mt-2">
                {expiring.slice(0, activeTab === 'inventario' ? 10 : 4).map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">
                          {batch.batch_code}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {batch.ingredient?.name || 'Materia Prima'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Vence: {formatHumanDate(batch.expiration_date)} · Disp: {batch.current_quantity} kg
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg border ${
                        batch.status === 'critical'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {batch.status === 'critical' ? 'URGENTE FEFO' : 'PRIORIZAR'}
                    </span>
                  </div>
                ))}
                {expiring.length === 0 && (
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
                    <p className="text-xs font-bold text-emerald-800">
                      100% de lotes dentro de ventana óptima de frescura
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Regla activa: Bloqueo automático de lotes vencidos en BOM</span>
              <Link to="/stock/alertas" className="font-bold text-slate-900 hover:underline">
                Auditar Alertas
              </Link>
            </div>
          </div>
        )}

        {(activeTab === 'resumen' || activeTab === 'logistica') && (
          <div className={`${activeTab === 'logistica' ? 'lg:col-span-12' : 'lg:col-span-4'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                    CADENA DE SUMINISTRO B2B
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Consolidación & Flota Refrigerada
                  </h2>
                </div>
                <Link
                  to="/delivery"
                  className="text-xs font-bold text-[#3E5500] hover:underline shrink-0"
                >
                  Mapa GPS →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Por Consolidar</span>
                  <p className="text-xl font-black font-mono text-amber-900 tabular-data mt-0.5">
                    {kpis.pending_orders || 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80">
                  <span className="text-[10px] font-bold uppercase text-sky-800 block">En Tránsito</span>
                  <p className="text-xl font-black font-mono text-sky-900 tabular-data mt-0.5">
                    {kpis.in_transit_orders || 0}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Entregados</span>
                  <p className="text-xl font-black font-mono text-emerald-900 tabular-data mt-0.5">
                    {kpis.completed_orders || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <Link
                  to="/stock/entradas"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-lime-400 flex items-center justify-center text-xs font-mono font-bold">
                      01
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Cruce ASN / Muelle de Frío</p>
                      <p className="text-[10px] text-slate-500">Verificación de tara, temperatura ≤ 4°C y mermas</p>
                    </div>
                  </div>
                  <AppIcon name="chevron-right" size={14} className="text-slate-400" />
                </Link>

                <Link
                  to="/orders"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-lime-400 flex items-center justify-center text-xs font-mono font-bold">
                      02
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Bandeja de Consolidación B2B</p>
                      <p className="text-[10px] text-slate-500">Asignación de ruta en bloque y liberación a Picking</p>
                    </div>
                  </div>
                  <AppIcon name="chevron-right" size={14} className="text-slate-400" />
                </Link>

                <Link
                  to="/delivery/cobro"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-lime-400 flex items-center justify-center text-xs font-mono font-bold">
                      03
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Entrega POD & Recaudo OTP</p>
                      <p className="text-[10px] text-slate-500">Confirmación en cliente y liquidación de ruta</p>
                    </div>
                  </div>
                  <AppIcon name="chevron-right" size={14} className="text-slate-400" />
                </Link>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Integración directa con App Móvil de Bodega y Conductores</span>
              <Link to="/orders" className="font-bold text-slate-900 hover:underline">
                Ir a Despacho
              </Link>
            </div>
          </div>
        )}

        {(activeTab === 'resumen' || activeTab === 'finanzas') && (
          <div className={`${activeTab === 'finanzas' ? 'lg:col-span-12' : 'lg:col-span-3'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                    TESORERÍA & COSTOS (COP)
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Recaudo & Mermas Planta
                  </h2>
                </div>
                <Link
                  to="/reports"
                  className="text-xs font-bold text-[#3E5500] hover:underline shrink-0"
                >
                  P&G →
                </Link>
              </div>

              <div className="space-y-2.5 my-3">
                <div className="p-3 rounded-xl bg-slate-900 text-white">
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/60 uppercase">
                    <span>Facturación B2B Acumulada</span>
                    <span className="text-lime-400">COP</span>
                  </div>
                  <p className="text-lg font-black font-mono text-white tabular-data mt-0.5">
                    {formatCOP(totalRevenue, true)}
                  </p>
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-white/70 mb-1">
                      <span>Efectividad de Recaudo</span>
                      <span className="font-mono font-bold text-lime-400">{collectionRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-400 rounded-full"
                        style={{ width: `${collectionRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Recaudado en Caja / Banco
                    </span>
                    <p className="text-sm font-black font-mono text-[#3E5500] tabular-data">
                      {formatCOP(totalCollected, true)}
                    </p>
                  </div>
                  <AppIcon name="bank2" size={16} className="text-[#3E5500]" />
                </div>

                <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-rose-700 block">
                      Mermas Físicas Acumuladas
                    </span>
                    <p className="text-sm font-black font-mono text-rose-700 tabular-data">
                      {kpis.total_waste_kg || 0} kg
                    </p>
                  </div>
                  <Link
                    to="/cost/mermas"
                    className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    Ver Bitácora
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Costeo por absorción BOM</span>
              <Link to="/cost/simulador" className="font-bold text-slate-900 hover:underline">
                Simulador Margen
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
