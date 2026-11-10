import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppIcon from '../components/AppIcon';
import { orders, delivery } from '../services/api';
import FreshCard from '../components/FreshCard';
import TechBadge from '../components/TechBadge';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatCOP } from '../utils/currencyFormatter';
import { hasModuleAccess, can } from '../constants/roles';

export default function Orders({ user }) {
  const role = user?.role || 'ADMINISTRADOR';
  const [orderList, setOrderList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [targetRouteId, setTargetRouteId] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [syncingIntake, setSyncingIntake] = useState(false);

  const [showDetail, setShowDetail] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Control de registro y roles: valida si el usuario tiene acceso al modulo de pedidos y permisos de actualizacion
  const canAccess = hasModuleAccess(role, 'orders_delivery');
  const isManager = role === 'ADMINISTRADOR' || role === 'OPERARIO_LOGISTICO';
  const canUpdate = can(role, 'update') && isManager;

  // Llenado de CRUDs (index - Listar): pide al backend la lista de pedidos por la ruta /api/orders y guarda el JSON de respuesta en los estados orderList y summary
  const fetchOrders = useCallback(() => {
    setLoading(true);
    orders
      .list({
        status: filterStatus === 'all' ? undefined : filterStatus,
        search: search.trim() || undefined,
      })
      .then((res) => {
        setOrderList(res.data.orders || []);
        setSummary(res.data.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus, search]);

  useEffect(() => {
    if (!canAccess) return;
    fetchOrders();
    delivery
      .getRoutes()
      .then((res) => setRoutes(res.data.routes || []))
      .catch(() => {});
  }, [canAccess, fetchOrders]);

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allVisibleSelected =
    orderList.length > 0 && orderList.every((o) => selectedOrderIds.has(o.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(orderList.map((o) => o.id)));
    }
  };

  const selectedTotalAmount = useMemo(() => {
    return orderList
      .filter((o) => selectedOrderIds.has(o.id))
      .reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  }, [orderList, selectedOrderIds]);

  // Llenado de CRUDs (update / bulkRelease): envia los pedidos seleccionados y la ruta elegida al backend, recibe el JSON de confirmacion y recarga la bandeja
  const handleBulkRelease = async () => {
    if (selectedOrderIds.size === 0) {
      setFeedback({ type: 'error', message: 'Selecciona al menos un pedido de la bandeja.' });
      return;
    }
    if (!targetRouteId) {
      setFeedback({
        type: 'error',
        message: 'Selecciona la ruta de despacho a la que se asignarán los pedidos.',
      });
      return;
    }

    setBulkProcessing(true);
    setFeedback(null);
    try {
      const res = await orders.bulkRelease({
        order_ids: Array.from(selectedOrderIds),
        route_id: parseInt(targetRouteId, 10),
      });

      setFeedback({
        type: 'success',
        message:
          res.data.message ||
          `${selectedOrderIds.size} pedidos liberados exitosamente para picking en bodega.`,
      });
      setSelectedOrderIds(new Set());
      setTargetRouteId('');
      fetchOrders();
    } catch (e) {
      setFeedback({
        type: 'error',
        message: e.response?.data?.message || 'Error al liberar pedidos para picking.',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSimulateIntake = async () => {
    setSyncingIntake(true);
    setFeedback(null);
    try {
      const res = await orders.simulateIntake();
      setFeedback({
        type: 'success',
        message:
          res.data.message ||
          'Nueva demanda B2B sincronizada automáticamente en la bandeja de entrada.',
      });
      fetchOrders();
    } catch (e) {
      setFeedback({
        type: 'error',
        message: e.response?.data?.message || 'Error al sincronizar demanda comercial.',
      });
    } finally {
      setSyncingIntake(false);
    }
  };

  const handleAssignSingleRoute = async (order, routeId) => {
    try {
      await orders.update(order.id, { route_id: routeId ? parseInt(routeId, 10) : null });
      fetchOrders();
      if (showDetail) {
        setShowDetail((prev) => (prev ? { ...prev, route_id: routeId } : null));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'No se pudo asignar la ruta');
    }
  };

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-full bg-cream">
        <div className="text-center">
          <div className="text-6xl mb-4">
            <AppIcon name="lock-fill"  aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Acceso Denegado</h2>
          <p className="text-sm text-slate-500 mt-2">No tienes permisos para acceder a Pedidos</p>
          <p className="text-xs text-slate-400 mt-4">Rol: {user?.role_label}</p>
        </div>
      </div>
    );
  }

  const filters = [
    { value: 'all', label: 'Toda la Demanda' },
    { value: 'pending', label: 'Pendientes por Asignar' },
    { value: 'assigned', label: 'Liberados / En Picking' },
    { value: 'in_transit', label: 'En Ruta' },
    { value: 'delivered', label: 'Entregados' },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Bandeja de Consolidación de Pedidos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              Demanda B2B
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Órdenes pre-cargadas desde canal comercial. Selección masiva para asignación de ruta y liberación directa para picking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <TechBadge label="CONSOLIDACIÓN & RUTEO" color="lime" />
          <button
            type="button"
            onClick={handleSimulateIntake}
            disabled={syncingIntake}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-lime-400 border border-slate-800 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer btn-press active:scale-95"
            title="Sincroniza automáticamente nuevos pedidos pre-cargados de clientes B2B para mañana"
          >
            <AppIcon name="cloud-arrow-down" size={14} className={syncingIntake ? 'animate-bounce' : ''} />
            <span>{syncingIntake ? 'Sincronizando...' : 'Sincronizar Demanda B2B'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm border flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-lime-50 border-lime-300 text-lime-900'
          }`}
        >
          <AppIcon name={feedback.type === 'error' ? 'exclamation-octagon' : 'check2-circle'} className={`-${feedback.type === 'error' ? 'exclamation-octagon' : 'check2-circle'}`} 
            aria-hidden="true"
          />
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        <FreshCard
          title="Demanda Total"
          value={summary?.total || 0}
          subtitle="Pedidos en bandeja"
          icon="clipboard-data"
          color="slate"
        />
        <FreshCard
          title="Pendientes por Asignar"
          value={summary?.pending || 0}
          subtitle="Listos para consolidar"
          icon="hourglass-split"
          color="terracotta"
        />
        <FreshCard
          title="En Picking / Ruta"
          value={(summary?.total || 0) - (summary?.pending || 0) - (summary?.delivered || 0)}
          subtitle="Órdenes liberadas"
          icon="truck"
          color="lime"
        />
        <FreshCard
          title="Monto Consolidado"
          value={formatCOP(summary?.total_amount || 0, true)}
          subtitle="Valor total de pedidos (COP)"
          icon="cash-coin"
          color="lime"
        />
      </div>

      {selectedOrderIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400 text-slate-900 flex items-center justify-center font-bold text-lg shrink-0">
              <AppIcon name="boxes"  aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  {selectedOrderIds.size} {selectedOrderIds.size === 1 ? 'pedido seleccionado' : 'pedidos seleccionados'}
                </span>
                <span className="text-[11px] font-mono bg-lime-400 text-slate-900 font-bold px-2 py-0.5 rounded-full">
                  Total: {formatCOP(selectedTotalAmount, true)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidar carga en una ruta de reparto y despachar al móvil de bodega para alistamiento físico.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={targetRouteId}
              onChange={(e) => setTargetRouteId(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-lime-400 cursor-pointer"
            >
              <option value="" className="text-slate-900">-- Seleccionar Ruta de Reparto --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id} className="text-slate-900">
                  {r.route_code} — {r.destination} ({r.driver?.name?.split(' ')[0] || 'Sin driver'})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleBulkRelease}
              disabled={bulkProcessing || !targetRouteId}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg btn-press ${
                targetRouteId && !bulkProcessing
                  ? 'bg-lime-400 hover:bg-lime-500 text-slate-900 cursor-pointer active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <AppIcon name="box-seam" size={14} className={bulkProcessing ? 'animate-spin' : ''} />
              <span>{bulkProcessing ? 'Liberando...' : 'Liberar para Picking'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
              title="Cancelar selección masiva"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === f.value
                  ? 'bg-lime-400 text-slate-900 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <AppIcon name="search" className="absolute left-3 top-2.5 text-xs text-slate-400"  aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o destino..."
            className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-60 focus:ring-2 focus:ring-lime-400 outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-slate-900 accent-slate-900 cursor-pointer"
                  title="Seleccionar / deseleccionar todos los visibles"
                />
              </th>
              <th className="py-3 px-3 font-mono">Orden #</th>
              <th className="py-3 px-3">Cliente B2B</th>
              <th className="py-3 px-3">Destino de Entrega</th>
              <th className="py-3 px-3">Monto (COP)</th>
              <th className="py-3 px-3">Estado Operativo</th>
              <th className="py-3 px-3">Método de Pago</th>
              <th className="py-3 px-3">Ruta Asignada</th>
              <th className="py-3 px-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                    Cargando demanda de pedidos...
                  </span>
                </td>
              </tr>
            )}

            {!loading && orderList.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                  <AppIcon name="inbox" className="text-3xl block mb-2 text-slate-300"  aria-hidden="true" />
                  No hay pedidos pendientes en este filtro. Presiona &quot;Sincronizar Demanda B2B&quot; para recibir pedidos pre-cargados.
                </td>
              </tr>
            )}

            {!loading &&
              orderList.map((order) => {
                const isSelected = selectedOrderIds.has(order.id);

                return (
                  <tr
                    key={order.id}
                    onClick={() => toggleSelectOrder(order.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-lime-50/70'
                        : 'hover:bg-slate-50/70 bg-white'
                    }`}
                  >
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="w-4 h-4 rounded text-slate-900 accent-slate-900 cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-xs text-slate-900">
                      PED-{order.id}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="flex flex-col">
                        <span>{order.client_name || 'Cliente B2B'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Canal Comercial</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-700 text-xs max-w-[220px] truncate" title={order.destination}>
                      <AppIcon name="geo-alt" className="text-slate-400 mr-1"  aria-hidden="true" />
                      {order.destination}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-xs">
                      {formatCOP(order.amount)}
                    </td>

                    <td className="py-3 px-3">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={order.payment_status} />
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          ({order.payment_method === 'qr' ? 'QR' : 'Efectivo'})
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-xs">
                      {order.route ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {order.route.route_code}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                            {order.route.destination}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                          Sin ruta (Demanda pura)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setShowDetail(order)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                      >
                        Auditar
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={showDetail ? `Auditoría Pedido #PED-${showDetail.id}` : ''}
        footer={
          <button
            type="button"
            onClick={() => setShowDetail(null)}
            className="px-4 py-2 rounded-xl text-sm border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cerrar
          </button>
        }
      >
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-cream rounded-2xl p-3.5 border border-slate-200/80">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cliente B2B</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{showDetail.client_name || '—'}</p>
              </div>
              <div className="bg-cream rounded-2xl p-3.5 border border-slate-200/80">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Monto Liquidado</p>
                <p className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                  {formatCOP(showDetail.amount, true)}
                </p>
              </div>
              <div className="bg-cream rounded-2xl p-3.5 border border-slate-200/80 col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Destino de Entrega</p>
                <p className="font-semibold text-slate-900 text-xs mt-0.5">{showDetail.destination}</p>
              </div>
              <div className="bg-cream rounded-2xl p-3.5 border border-slate-200/80">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Estado de Entrega</p>
                <StatusBadge status={showDetail.status} />
              </div>
              <div className="bg-cream rounded-2xl p-3.5 border border-slate-200/80">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Estado del Pago</p>
                <StatusBadge status={showDetail.payment_status} />
              </div>
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 col-span-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-mono">OTP de Validación en Destino</p>
                  <p className="font-mono text-xl tracking-[0.3em] font-extrabold text-lime-400 mt-0.5">
                    {showDetail.otp_code || '—'}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 bg-white/10 px-2.5 py-1 rounded-lg">
                  Canal Seguro
                </span>
              </div>
            </div>

            {canUpdate && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-600 font-bold block">
                  Reasignar Ruta de Reparto
                </label>
                <select
                  value={showDetail.route_id || ''}
                  onChange={(e) => handleAssignSingleRoute(showDetail, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-lime-400 outline-none"
                >
                  <option value="">Sin ruta asignada (Demanda pendiente)</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_code} — {r.destination} ({r.driver?.name || 'Sin driver'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
