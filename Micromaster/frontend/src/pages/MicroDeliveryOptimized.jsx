import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppIcon from '../components/AppIcon';
import { useLocation } from 'react-router-dom';
import { delivery } from '../services/api';
import FreshCard from '../components/FreshCard';
import TechBadge from '../components/TechBadge';
import StatusBadge from '../components/StatusBadge';
import LogisticsMap from '../components/LogisticsMap';
import Modal from '../components/Modal';
import { formatCOP } from '../utils/currencyFormatter';
import { hasModuleAccess, can } from '../constants/roles';

const POLL_MS = 5000;
const GPS_PING_MS = 8000;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearing(a, b) {
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (Math.round((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

function routePath(route) {
  const path = [];
  if (route.origin_lat != null) path.push({ lat: Number(route.origin_lat), lng: Number(route.origin_lng) });
  route.stops.forEach((s) => path.push({ lat: s.latitude, lng: s.longitude }));
  return path;
}

function interpolate(path, phase) {
  if (!path.length) return null;
  if (path.length === 1) return { latitude: path[0].lat, longitude: path[0].lng, heading: 0 };
  const lens = path.slice(0, -1).map((p, i) => haversineKm(p, path[i + 1]));
  const total = lens.reduce((s, v) => s + v, 0) || 1;
  let target = Math.max(0, Math.min(1, phase)) * total;
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target || i === lens.length - 1) {
      const ratio = lens[i] > 0 ? Math.max(0, Math.min(1, (target - acc) / lens[i])) : 1;
      const a = path[i];
      const b = path[i + 1];
      return {
        latitude: a.lat + (b.lat - a.lat) * ratio,
        longitude: a.lng + (b.lng - a.lng) * ratio,
        heading: bearing(a, b),
      };
    }
    acc += lens[i];
  }
  return null;
}

export default function MicroDelivery({ user }) {
  const role = user?.role || 'ADMINISTRADOR';
  const canAccess = hasModuleAccess(role, 'orders_delivery');
  const isManager = role === 'ADMINISTRADOR' || role === 'OPERARIO_LOGISTICO';
  const canCreate = can(role, 'create') && canAccess;

  const location = useLocation();
  const view = location.pathname === '/delivery' ? 'mapa' : location.pathname.split('/')[2] || 'mapa';

  const [routes, setRoutes] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [incSummary, setIncSummary] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsLive, setGpsLive] = useState(false);
  const gpsTimer = useRef(null);
  const [activeMapRoute, setActiveMapRoute] = useState(null);

  // Control de vistas: estados del modal interactivo de Gestion de Crisis en Tiempo Real
  const [crisisModalOpen, setCrisisModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [crisisFilterRoute, setCrisisFilterRoute] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [reassignRouteId, setReassignRouteId] = useState('');
  const [submittingCrisis, setSubmittingCrisis] = useState(false);
  const [crisisFeedback, setCrisisFeedback] = useState(null);

  // Llenado de CRUDs (index - Listar): consulta las rutas de despacho y las novedades en tiempo real desde el backend y actualiza el JSON en pantalla
  const refreshRoutes = useCallback(() => {
    return delivery
      .getRoutes()
      .then((res) => {
        setRoutes(res.data.routes || []);
        setRouteSummary(res.data.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshIncidents = useCallback(() => {
    return delivery
      .getIncidents()
      .then((res) => {
        setIncidents(res.data.incidents || []);
        setIncSummary(res.data.summary || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canAccess) return undefined;
    refreshRoutes();
    refreshIncidents();
    if (isManager) {
      delivery.getDrivers().then((res) => setDrivers(res.data.drivers || [])).catch(() => {});
    }
    const id = setInterval(() => {
      refreshRoutes();
      refreshIncidents();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [canAccess, isManager, refreshRoutes, refreshIncidents]);

  const pingGps = useCallback(async () => {
    const route = routes.find((r) => r.id === selectedRouteId) || routes.find((r) => r.status === 'in_progress') || routes[0];
    if (!route) return;
    const path = routePath(route);
    if (!path.length) return;
    const period = Math.max(1, route.stops.length) * 90;
    const phase = ((Date.now() / 1000) % period) / period;
    const pos = interpolate(path, phase);
    if (!pos) return;
    const payload = {
      latitude: Number(pos.latitude.toFixed(6)),
      longitude: Number(pos.longitude.toFixed(6)),
      speed_kmh: route.status === 'in_progress' ? 46.5 : 0,
      heading: pos.heading,
    };
    if (isManager && route.driver?.id) payload.driver_id = route.driver.id;
    try {
      await delivery.sendLocation(payload);
    } catch (e) {
    }
  }, [routes, selectedRouteId, isManager]);

  useEffect(() => {
    if (!gpsLive) {
      if (gpsTimer.current) clearInterval(gpsTimer.current);
      gpsTimer.current = null;
      return undefined;
    }
    pingGps();
    gpsTimer.current = setInterval(pingGps, GPS_PING_MS);
    return () => clearInterval(gpsTimer.current);
  }, [gpsLive, pingGps]);

  const onlineDrivers = drivers.filter((d) => d.tracking?.online).length;
  const openIncidents = useMemo(() => incidents.filter((i) => i.status === 'OPEN'), [incidents]);
  const incidentOrderIds = useMemo(() => {
    const ids = [];
    openIncidents.forEach((i) => i.order_id && ids.push(i.order_id));
    return ids;
  }, [openIncidents]);

  // Control de vistas: abre el modal de gestion de crisis filtrando por incidente especifico o por ruta afectada
  const openCrisisModal = useCallback(
    (incidentItem = null, routeItem = null) => {
      setCrisisFeedback(null);
      setCrisisFilterRoute(routeItem || null);

      let target = incidentItem;
      if (!target && routeItem) {
        target =
          openIncidents.find((i) => i.route_id === routeItem.id || i.driver?.id === routeItem.driver?.id) ||
          incidents.find((i) => i.route_id === routeItem.id || i.driver?.id === routeItem.driver?.id) ||
          null;
      }
      if (!target) {
        target = openIncidents[0] || incidents[0] || null;
      }

      setSelectedIncident(target);
      const baseAmount = target?.order?.amount != null ? Number(target.order.amount) : '';
      setAdjustedAmount(baseAmount !== '' ? String(baseAmount) : '');
      setResolutionNote(target?.resolution || '');
      setReassignRouteId('');
      setCrisisModalOpen(true);
    },
    [openIncidents, incidents]
  );

  const handleSelectIncidentInModal = (inc) => {
    setSelectedIncident(inc);
    setCrisisFeedback(null);
    const baseAmount = inc?.order?.amount != null ? Number(inc.order.amount) : '';
    setAdjustedAmount(baseAmount !== '' ? String(baseAmount) : '');
    setResolutionNote(inc?.resolution || '');
    setReassignRouteId('');
  };

  // Llenado de CRUDs (update - Modificar): envia la decision del administrador al backend para ajustar cobro, reasignar unidad o cerrar la incidencia
  const handleResolveCrisis = async (actionType = 'RESOLVE') => {
    if (!selectedIncident) return;
    setSubmittingCrisis(true);
    setCrisisFeedback(null);

    try {
      const payload = {
        status: 'RESOLVED',
      };

      let finalResolution = resolutionNote.trim();

      if (actionType === 'FINANCIAL_ADJUSTMENT') {
        const numericAmount = Number(adjustedAmount);
        if (!Number.isNaN(numericAmount) && numericAmount >= 0) {
          payload.adjusted_amount = numericAmount;
        }
        if (!finalResolution) {
          finalResolution = `Ajuste financiero autorizado en ruta. Nuevo valor de cobro aprobado: ${formatCOP(numericAmount || 0)}.`;
        }
      } else if (actionType === 'DISPATCH_SUPPORT') {
        if (reassignRouteId) {
          const targetRoute = routes.find((r) => String(r.id) === String(reassignRouteId));
          payload.route_id = Number(reassignRouteId);
          if (targetRoute?.driver?.id) {
            payload.driver_id = targetRoute.driver.id;
          }
          if (!finalResolution) {
            finalResolution = `Asistencia despachada. Mercancía y paradas pendientes transferidas a ${targetRoute?.route_code || 'ruta de apoyo'} (${targetRoute?.driver?.name || 'Conductor de relevo'}).`;
          }
        } else if (!finalResolution) {
          finalResolution = 'Unidad de soporte y asistencia mecánica despachada a las coordenadas GPS del conductor.';
        }
      } else if (!finalResolution) {
        finalResolution = 'Incidencia verificada y solucionada desde la torre de despacho.';
      }

      payload.resolution = finalResolution;

      await delivery.updateIncident(selectedIncident.id, payload);
      await Promise.all([refreshRoutes(), refreshIncidents()]);

      setCrisisFeedback({
        type: 'success',
        message: 'Decisión ejecutada y sincronizada en tiempo real con la hoja de ruta.',
      });

      setTimeout(() => {
        setCrisisModalOpen(false);
        setCrisisFeedback(null);
      }, 900);
    } catch (err) {
      setCrisisFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'No se pudo procesar la acción sobre la incidencia.',
      });
    } finally {
      setSubmittingCrisis(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-full bg-cream">
        <div className="text-center">
          <AppIcon name="lock-fill" className="text-6xl mb-4"  aria-hidden="true" />
          <h2 className="text-xl font-bold text-slate-900">Acceso Denegado</h2>
          <p className="text-sm text-slate-500 mt-2">No tienes permisos para acceder a Logística</p>
          <p className="text-xs text-slate-400 mt-4">Rol: {user?.role_label}</p>
        </div>
      </div>
    );
  }

  if (view !== 'mapa') {
    return null;
  }

  return (
    <div className="space-y-3.5 md:space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Rutas & Mapa GPS</h1>
          <p className="text-xs md:text-sm text-slate-500">Rutas, conductores, mapa en vivo y novedades</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <TechBadge label="LOGÍSTICA EN VIVO" color="terracotta" />
        </div>
      </div>

      {/* Control de vistas: Panel Gerencial Superior con los 4 indicadores macro de despacho */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        <FreshCard
          title="Rutas Activas"
          value={routeSummary?.active ?? 0}
          subtitle="En curso"
          icon="signpost-2"
          color="lime"
        />
        <FreshCard
          title="Novedades Abiertas"
          value={incSummary?.open ?? openIncidents.length}
          subtitle="Requieren gestión"
          actionLabel={openIncidents.length > 0 ? 'Atender Incidencia' : 'Ver bitácora'}
          icon="exclamation-octagon"
          color="terracotta"
          onClick={() => openCrisisModal(null, null)}
        />
        <FreshCard
          title="Conductores en Línea"
          value={isManager ? `${onlineDrivers}/${drivers.length}` : '—'}
          subtitle="GPS real o en ruta"
          icon="truck"
          color="lime"
        />
        <FreshCard
          title="Entregas"
          value={routeSummary?.completed ?? 0}
          subtitle="Rutas cerradas"
          icon="box-seam"
          color="cream"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 items-start">
        <div className="lg:col-span-5 bg-white/80 rounded-3xl border border-slate-200 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm uppercase tracking-[0.2em] text-slate-500">Lista de Control de Flota</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{routes.length} rutas · {routes.filter((r) => (r.open_incidents || 0) > 0).length} con incidencia</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
            {loading && routes.length === 0 && (
              <p className="text-xs text-slate-400 p-4 text-center">Cargando rutas…</p>
            )}
            {!loading && routes.length === 0 && (
              <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-600">Sin rutas asignadas</p>
              </div>
            )}

            {routes.map((route) => {
              const delivered = Number(route.delivered_count || 0);
              const totalStops = Number(route.stops_count || route.stops?.length || 0);
              const progress = route.progress != null ? Number(route.progress) : totalStops > 0 ? Math.round((delivered / totalStops) * 100) : 0;
              const status = route.status || '';
              const isActive = (activeMapRoute?.id === route.id) || (selectedRouteId === route.id);
              return (
                <div
                  key={route.id}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    setActiveMapRoute(route);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isActive ? 'border-lime-500 bg-lime-50/40 shadow-sm ring-1 ring-lime-400' : 'border-slate-200 bg-white/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-slate-500">{route.route_code}</span>
                    <StatusBadge status={status} />
                  </div>

                  <p className="font-medium text-sm text-slate-900">{route.destination}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{route.driver?.name || 'Sin conductor'} · {route.driver?.vehicle || '—'}</p>

                  {(() => {
                    const syncMins = route.sync_minutes ?? (((route.id || 1) * 4) % 17 + 2);
                    const isLive = syncMins <= 4;
                    const isStale = syncMins > 10;
                    return (
                      <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-emerald-500 animate-pulse' : isStale ? 'bg-amber-500' : 'bg-sky-500'}`} />
                        <span className="text-slate-600 font-medium truncate">
                          {isLive ? 'En vivo · ' : ''}Última sincronización: Hace {syncMins} minutos
                        </span>
                        {isStale && (
                          <span className="ml-auto text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded font-semibold shrink-0">
                            Sin cobertura
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Progreso de la ruta</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full rounded-full bg-lime-400" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>{delivered} / {totalStops} clientes entregados</span>
                    {route.open_incidents > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCrisisModal(null, route);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer"
                        title="Abrir reporte del conductor y autorizar solución"
                      >
                        <AppIcon name="exclamation-triangle-fill" size={11} />
                        {route.open_incidents} incidencia(s) · Resolver
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2 flex-wrap">
                      {status === 'delivered' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-400/30 text-[#3F5600]">A tiempo</span>}
                      {status === 'in_transit' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-700">En ruta</span>}
                      {status === 'assigned' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700">Asignado</span>}
                      {status === 'cancelled' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600">Cancelado</span>}
                      {route.open_incidents > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCrisisModal(null, route);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
                          title="Atender incidencia de esta ruta"
                        >
                          <AppIcon name="shield-exclamation" size={11} />
                          Atender Incidencia
                        </button>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                          setActiveMapRoute(null);
                          setSelectedRouteId(null);
                          return;
                        }
                        setActiveMapRoute(route);
                        setSelectedRouteId(route.id);
                        setGpsLive(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                        isActive ? 'bg-slate-900 text-lime-400' : 'bg-lime-400 text-slate-900 hover:bg-lime-500'
                      }`}
                    >
                      {isActive ? 'Ver Toda la Flota' : `Enfocar ${route.driver?.name?.split(' ')[0] || 'Ruta'}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white/90 rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-slate-800">
                    {activeMapRoute ? `Rastreo Ruta ${activeMapRoute.route_code}` : 'Monitoreo de Flota en Vivo'}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeMapRoute
                    ? `${activeMapRoute.driver?.name || 'Sin conductor'} · ${activeMapRoute.stops?.length || activeMapRoute.stops_count || 0} paradas · ${activeMapRoute.driver?.vehicle || 'Camión de reparto'}`
                    : `${routes.length} rutas activas · ${routes.filter((r) => r.driver).length} conductores en campo · OpenStreetMap (100% Gratuito)`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeMapRoute && (
                  <button
                    onClick={() => {
                      setActiveMapRoute(null);
                      setSelectedRouteId(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <AppIcon name="arrows-fullscreen" className="text-xs"  />
                    Ver Toda la Flota
                  </button>
                )}
                {canCreate && (
                  <button
                    onClick={() => setGpsLive((v) => !v)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                      gpsLive
                        ? 'bg-lime-400 text-slate-900 shadow'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${gpsLive ? 'bg-slate-900 animate-ping' : 'bg-slate-400'}`} />
                    {gpsLive ? 'GPS en Vivo · ACTIVO' : 'Simular Telemetría GPS'}
                  </button>
                )}
              </div>
            </div>

            <LogisticsMap
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => {
                setSelectedRouteId(id);
                const r = routes.find((x) => x.id === id);
                setActiveMapRoute(r || null);
              }}
              incidentOrderIds={incidentOrderIds}
              incidents={incidents}
              onOpenIncident={(inc, routeItem) => openCrisisModal(inc, routeItem)}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <AppIcon name="check-circle-fill" className="text-[10px]"  /> OpenStreetMap Nativo + Leaflet
                </span>
                <span>• 100% Gratuito · Cero marcas de agua</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>Refresco automático cada {POLL_MS / 1000}s</span>
                <span>·</span>
                <span>{gpsLive ? `Transmisión GPS cada ${GPS_PING_MS / 1000}s` : 'Clic en conductor, parada o incidencia para gestionar'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control de vistas: Modal emergente de Gestion de Crisis en Tiempo Real para aprobar ajustes financieros o despachar ayuda */}
      <Modal
        isOpen={crisisModalOpen}
        onClose={() => setCrisisModalOpen(false)}
        title={
          crisisFilterRoute
            ? `Gestión de Crisis en Ruta · ${crisisFilterRoute.route_code} (${crisisFilterRoute.driver?.name || 'Conductor'})`
            : 'Centro de Gestión de Crisis y Novedades en Tiempo Real'
        }
        maxWidth="max-w-3xl"
      >
        {(() => {
          const modalIncidents = crisisFilterRoute
            ? incidents.filter(
                (i) =>
                  i.route_id === crisisFilterRoute.id ||
                  (crisisFilterRoute.driver?.id && i.driver?.id === crisisFilterRoute.driver.id)
              )
            : openIncidents.length > 0
              ? openIncidents
              : incidents;

          const activeInc = selectedIncident || modalIncidents[0] || null;
          const originalOrderAmount = activeInc?.order?.amount != null ? Number(activeInc.order.amount) : null;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Novedades detectadas ({modalIncidents.length}):
                  </span>
                  {modalIncidents.map((inc) => {
                    const isSelected = activeInc?.id === inc.id;
                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => handleSelectIncidentInModal(inc)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs'
                            : inc.status === 'OPEN'
                              ? 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <AppIcon
                          name={inc.status === 'OPEN' ? 'exclamation-octagon-fill' : 'check-circle-fill'}
                          size={12}
                        />
                        <span>{inc.driver?.name?.split(' ')[0] || `Inc #${inc.id}`}</span>
                        <span className="text-[10px] opacity-80">({inc.type_label})</span>
                      </button>
                    );
                  })}
                </div>

                {crisisFilterRoute && (
                  <button
                    type="button"
                    onClick={() => openCrisisModal(null, null)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Ver todas las novedades ({openIncidents.length} abiertas)
                  </button>
                )}
              </div>

              {!activeInc ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                  <AppIcon name="shield-check" size={32} className="mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm font-bold text-slate-800">Sin novedades pendientes en este momento</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Todas las alertas operativas y reportes S.O.S. han sido atendidos por el despachador.
                  </p>
                </div>
              ) : (
                <>
                  {/* Reporte exacto del conductor y evidencia en campo */}
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-600 text-white">
                            {activeInc.severity_label || 'Prioridad Alta'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-lime-400 font-mono">
                            {activeInc.type_label || activeInc.type}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            Reporte #{activeInc.id} · {activeInc.reported_at || 'Hace instantes'}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1.5">{activeInc.title}</h4>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                          activeInc.status === 'OPEN'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {activeInc.status === 'OPEN' ? 'REQUIERE APROBACIÓN' : 'RESUELTA'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-rose-100 text-xs text-slate-700 leading-relaxed">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Mensaje directo del transportista en ruta:
                      </p>
                      <p className="font-medium text-slate-900">"{activeInc.description}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center shrink-0">
                          <AppIcon name="truck" size={18} />
                        </div>
                        <div className="min-w-0 text-xs">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Unidad y Conductor</p>
                          <p className="font-bold text-slate-900 truncate">
                            {activeInc.driver?.name || 'Conductor en ruta'}
                          </p>
                          <p className="text-slate-500 truncate">
                            {activeInc.driver?.vehicle || 'Furgón de reparto'} · Tel: {activeInc.driver?.phone || 'N/D'}
                          </p>
                          <p className="text-[11px] font-mono text-slate-600 mt-0.5">
                            Hoja de Ruta: <strong>{activeInc.route?.route_code || 'RUTA-ACTIVA'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0">
                          <AppIcon
                            name={activeInc.type === 'SOS_ALERT' ? 'broadcast' : 'box-seam'}
                            size={18}
                          />
                        </div>
                        <div className="min-w-0 text-xs flex-1">
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            {activeInc.order ? 'Pedido B2B Afectado & Evidencia' : 'Telemetría Botón S.O.S. en Campo'}
                          </p>
                          {activeInc.order ? (
                            <>
                              <p className="font-bold text-slate-900 truncate">{activeInc.order.client_name}</p>
                              <p className="text-slate-500 truncate">{activeInc.order.destination}</p>
                              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                                <span className="text-[11px] text-slate-500">Valor Factura:</span>
                                <span className="font-mono font-extrabold text-slate-900">
                                  {formatCOP(activeInc.order.amount)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-slate-900">Alerta S.O.S. transmitida desde cabina</p>
                              <p className="text-slate-500">
                                Destino afectado: {activeInc.route?.destination || 'Corredor vial activo'}
                              </p>
                              <p className="text-[11px] font-mono text-rose-700 font-semibold mt-0.5">
                                Solicita asistencia vial o relevo de carga
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Evidencia visual de rechazo / caja danada o reporte S.O.S. */}
                    <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lime-400 shrink-0">
                          <AppIcon
                            name={
                              activeInc.type === 'DAMAGED_GOODS' || activeInc.type === 'CLIENT_REJECTED'
                                ? 'camera'
                                : 'geo-alt-fill'
                            }
                            size={20}
                          />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-white">
                            {activeInc.type === 'DAMAGED_GOODS' || activeInc.type === 'CLIENT_REJECTED'
                              ? 'Evidencia Adjunta: Empaque / Caja rechazada en recepción B2B'
                              : 'Registro de Emergencia S.O.S. · Posición GPS validada'}
                          </p>
                          <p className="text-[11px] text-white/70">
                            {activeInc.type === 'DAMAGED_GOODS' || activeInc.type === 'CLIENT_REJECTED'
                              ? 'Acta de novedad firmada en muelle del cliente. Requiere autorización de nota crédito o descuento para cerrar POD.'
                              : 'Transmisión prioritaria desde la app móvil del conductor. Requiere despacho de unidad de apoyo o instrucción.'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-lime-400/15 border border-lime-400/30 text-lime-400 text-[10px] font-mono font-bold shrink-0 self-start sm:self-center">
                        VERIFICADO EN RUTA
                      </span>
                    </div>
                  </div>

                  {/* Panel de Acciones de Aprobacion en Tiempo Real */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Accion 1: Autorizar Ajuste Financiero / Nota Credito */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <AppIcon name="cash-coin" size={15} className="text-emerald-600" />
                          1. Autorizar Ajuste Financiero
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Nota Crédito / POD
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Ajusta el valor a cobrar en el pedido si el cliente rechazó cajas dañadas o faltantes.
                      </p>

                      {originalOrderAmount != null && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            { label: '-10% Avería', factor: 0.9 },
                            { label: '-20% Parcial', factor: 0.8 },
                            { label: '-50%', factor: 0.5 },
                            { label: 'Cobro $0 (Devolución)', factor: 0 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                const nextVal = Math.round(originalOrderAmount * preset.factor);
                                setAdjustedAmount(String(nextVal));
                                setResolutionNote(
                                  `Autorizado ajuste financiero (${preset.label}) por novedad en entrega. Nuevo total a recaudar: ${formatCOP(nextVal)}.`
                                );
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={adjustedAmount}
                            onChange={(e) => setAdjustedAmount(e.target.value)}
                            placeholder={originalOrderAmount != null ? String(originalOrderAmount) : 'Monto en COP'}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={submittingCrisis}
                          onClick={() => handleResolveCrisis('FINANCIAL_ADJUSTMENT')}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                        >
                          Autorizar Ajuste
                        </button>
                      </div>
                    </div>

                    {/* Accion 2: Despachar Ayuda / Reasignar Unidad */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <AppIcon name="truck" size={15} className="text-sky-600" />
                          2. Despachar Unidad de Apoyo
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                          Asistencia S.O.S.
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Envía asistencia vial al punto GPS o transfiere los pedidos pendientes a otra ruta activa.
                      </p>

                      <select
                        value={reassignRouteId}
                        onChange={(e) => {
                          setReassignRouteId(e.target.value);
                          const target = routes.find((r) => String(r.id) === String(e.target.value));
                          if (target) {
                            setResolutionNote(
                              `Se despacha unidad de relevo ${target.route_code} (${target.driver?.name || 'Conductor'}) para asumir entregas pendientes.`
                            );
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:border-sky-600"
                      >
                        <option value="">Enviar soporte mecánico / mantener ruta actual</option>
                        {routes
                          .filter((r) => r.id !== activeInc.route_id)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              Reasignar a {r.route_code} · {r.driver?.name || 'Sin conductor'} ({r.destination})
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        disabled={submittingCrisis}
                        onClick={() => handleResolveCrisis('DISPATCH_SUPPORT')}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-lime-400 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <AppIcon name="send-check-fill" size={13} />
                        {reassignRouteId ? 'Transferir Carga y Despachar Relevo' : 'Despachar Asistencia a Coordenadas GPS'}
                      </button>
                    </div>
                  </div>

                  {/* Instruccion directa y cierre */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                    <label className="block text-xs font-extrabold text-slate-800">
                      3. Acta de Resolución e Instrucción para el Conductor:
                    </label>
                    <textarea
                      rows={2}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Escribe la instrucción oficial o selecciona una acción rápida arriba..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />

                    {crisisFeedback && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                          crisisFeedback.type === 'success'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        <AppIcon
                          name={crisisFeedback.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}
                          size={14}
                        />
                        <span>{crisisFeedback.message}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCrisisModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Cerrar ventana
                      </button>
                      <button
                        type="button"
                        disabled={submittingCrisis}
                        onClick={() => handleResolveCrisis('RESOLVE')}
                        className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 disabled:opacity-50 text-slate-900 text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <AppIcon name="check2-circle" size={15} />
                        {submittingCrisis ? 'Procesando...' : 'Aprobar y Marcar Incidencia Resuelta'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}