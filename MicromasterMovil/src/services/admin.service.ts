import { api } from '@/services/api';
import { pickObject } from '@/utils/payload';

export interface FinancialKpis {
  cash_in_street: number;
  inventory_value: number;
  daily_waste_cost: number;
  routes_completed?: number;
  routes_total?: number;
}

export interface StockDepletionItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  minimum_required: number;
  affected_orders: number;
  criticality: 'HIGH' | 'CRITICAL';
}

export interface OperationalUserItem {
  id: number;
  name: string;
  email: string;
  role_label: string;
  vehicle?: string;
  is_active: boolean;
  phone?: string;
}

export interface DriverSosSignal {
  id: string;
  driver_name: string;
  vehicle: string;
  phone: string;
  reason: string;
  location: string;
  timestamp: string;
  status: 'ACTIVE' | 'RESOLVED';
}

export interface AdminDashboardData {
  kpis: FinancialKpis;
  summary: {
    pending_approvals_count: number;
    critical_alerts_count: number;
    currency: string;
    updated_at: string;
    routes_completed: number;
    routes_total: number;
  };
}

export interface ApprovalItem {
  id: string;
  event_type: 'USER_REGISTRATION' | 'CREDIT_LIMIT_EXCEEDED' | 'HIGH_VALUE_WASTE' | 'INVOICE_CANCELLATION' | string;
  title: string;
  description: string;
  requester_name: string;
  requester_role: string;
  amount: number;
  target_client?: string;
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status_label: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_comment?: string;
}

export interface CriticalAlertItem {
  id: string;
  type: 'ROUTE_CRITICAL_DELAY' | 'VITAL_STOCK_DEPLETED' | 'SANITARY_QUARANTINE' | string;
  title: string;
  message: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  category: string;
  affected_entity: string;
  trigger_reason: string;
  created_at: string;
  dismissed: boolean;
}

const FALLBACK_DASHBOARD: AdminDashboardData = {
  kpis: {
    cash_in_street: 1825000,
    inventory_value: 48500000,
    daily_waste_cost: 156000,
    routes_completed: 4,
    routes_total: 5,
  },
  summary: {
    pending_approvals_count: 3,
    critical_alerts_count: 3,
    routes_completed: 4,
    routes_total: 5,
    currency: 'COP',
    updated_at: new Date().toISOString(),
  },
};

export const FALLBACK_STOCK_DEPLETIONS: StockDepletionItem[] = [
  {
    id: 'dep-1',
    name: 'Harina de Trigo Especial Fortificada',
    current_stock: 0,
    unit: 'Kg',
    minimum_required: 150,
    affected_orders: 2,
    criticality: 'CRITICAL',
  },
  {
    id: 'dep-2',
    name: 'Aceite Vegetal Palma Real (Caja x 12)',
    current_stock: 0,
    unit: 'Cajas',
    minimum_required: 25,
    affected_orders: 1,
    criticality: 'HIGH',
  },
];

export const FALLBACK_SOS_SIGNALS: DriverSosSignal[] = [
  {
    id: 'sos-1',
    driver_name: 'Andrés Rivas Castañeda',
    vehicle: 'Camión NPR (JKP 482)',
    phone: '+57 310 445 8890',
    reason: 'Falla Mecánica: Rotura de manguera de radiador en carretera',
    location: 'Av. Las Palmas Km 4 - Sector Chuscalito',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    status: 'ACTIVE',
  },
];

export const FALLBACK_OPERATIONAL_USERS: OperationalUserItem[] = [
  {
    id: 5,
    name: 'Andrés Rivas Castañeda',
    email: 'conductor1@micromaster.com',
    role_label: 'Conductor / Transportista',
    vehicle: 'Camión Chevrolet NPR - JKP 482',
    is_active: true,
    phone: '+57 310 445 8890',
  },
  {
    id: 6,
    name: 'Laura Sofía Marín',
    email: 'conductor2@micromaster.com',
    role_label: 'Conductor / Transportista',
    vehicle: 'Camión Isuzu NPR - MTR 917',
    is_active: true,
    phone: '+57 315 209 7741',
  },
  {
    id: 7,
    name: 'Camilo Andrés Ospino',
    email: 'conductor3@micromaster.com',
    role_label: 'Conductor / Transportista',
    vehicle: 'Camión Hyundai HD78 - TDS 305',
    is_active: true,
    phone: '+57 301 663 2058',
  },
  {
    id: 3,
    name: 'Carlos Mendoza',
    email: 'logistica@micromaster.com',
    role_label: 'Operario de Bodega',
    vehicle: 'Bodega Principal',
    is_active: true,
    phone: '+57 312 889 0041',
  },
];

let localOperationalUsers = [...FALLBACK_OPERATIONAL_USERS];
let localSosSignals = [...FALLBACK_SOS_SIGNALS];
let localStockDepletions = [...FALLBACK_STOCK_DEPLETIONS];

const FALLBACK_APPROVALS: ApprovalItem[] = [
  {
    id: 'user-8',
    event_type: 'USER_REGISTRATION',
    title: 'Alta de Personal: juan',
    description: 'Solicitud de acceso al sistema MicroMaster como Operario Logístico.',
    requester_name: 'juan',
    requester_role: 'Operario Logístico',
    amount: 0,
    target_client: 'juan@micromaster.com',
    details: 'Cuenta nueva registrada desde formulario de ingreso. Requiere habilitación RBAC del Administrador.',
    severity: 'HIGH',
    status: 'PENDING',
    status_label: 'Pendiente de Autorización',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'app-1',
    event_type: 'CREDIT_LIMIT_EXCEEDED',
    title: 'Exceso de Cupo de Crédito',
    description: 'Cliente Distribuidora El Éxito solicita despacho a crédito superando el límite asignado.',
    requester_name: 'María Camila Palechor',
    requester_role: 'Operario Logístico',
    amount: 145000,
    target_client: 'Distribuidora El Éxito',
    details: 'Cupo disponible: $500.000 | Total pedido: $645.000 | Exceso: $145.000 (Supera margen de $100.000)',
    severity: 'HIGH',
    status: 'PENDING',
    status_label: 'Pendiente de Autorización',
    created_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
  {
    id: 'app-2',
    event_type: 'HIGH_VALUE_WASTE',
    title: 'Baja de Mercancía de Alto Valor',
    description: 'Intento de registro de merma por deterioro de insumo en planta.',
    requester_name: 'Kevin Jesus Millan',
    requester_role: 'Supervisor de Producción',
    amount: 84000,
    target_client: 'Planta Principal - Lote #LT-7821',
    details: '18 kg Harina de Trigo Especial por $84.000. Requiere autorización por superar el umbral de $50.000.',
    severity: 'MEDIUM',
    status: 'PENDING',
    status_label: 'Pendiente de Autorización',
    created_at: new Date(Date.now() - 42 * 60000).toISOString(),
  },
  {
    id: 'app-3',
    event_type: 'INVOICE_CANCELLATION',
    title: 'Anulación de Factura en Calle',
    description: 'El transportista solicita cancelar factura completa #104 en destino.',
    requester_name: 'Andrés Rivas Castañeda',
    requester_role: 'Transportista (Camión JKP 482)',
    amount: 245000,
    target_client: 'Tiendas Don Lucho',
    details: 'Cliente cerrado por remodelación no avisada. Conductor solicita anular entrega y reingresar stock.',
    severity: 'CRITICAL',
    status: 'PENDING',
    status_label: 'Pendiente de Autorización',
    created_at: new Date(Date.now() - 65 * 60000).toISOString(),
  },
];

const FALLBACK_ALERTS: CriticalAlertItem[] = [
  {
    id: 'alt-1',
    type: 'ROUTE_CRITICAL_DELAY',
    title: 'Ruta Sur-01 con 48% de Retraso',
    message: 'La ruta completa supera el 40% de retraso previsto (tiempo estimado: 140 min vs 210 min transcurridos). Riesgo inminente de clientes caídos.',
    severity: 'CRITICAL',
    category: 'LOGÍSTICA MACRO',
    affected_entity: 'Ruta RUTA-SUR-01 (4 clientes en riesgo)',
    trigger_reason: 'Vía bloqueada por manifestación en sector San Juan + falla mecánica reportada.',
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
    dismissed: false,
  },
  {
    id: 'alt-2',
    type: 'VITAL_STOCK_DEPLETED',
    title: 'Quiebre de Stock: Harina de Trigo Especial',
    message: 'El stock de insumo vital para producción llegó a CERO (0 kg en bodega). 2 órdenes de producción detenidas.',
    severity: 'EMERGENCY',
    category: 'PRODUCCIÓN',
    affected_entity: 'Insumo #101 - Harina de Trigo Especial',
    trigger_reason: 'Consumo acelerado del turno matutino y retraso en despacho del proveedor Harinera del Valle.',
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    dismissed: false,
  },
  {
    id: 'alt-3',
    type: 'SANITARY_QUARANTINE',
    title: 'Alerta Sanitaria / Cuarentena Automática',
    message: 'Se reportó el lote #LT-8492 de Levadura Fresca en cuarentena automática preventiva por inconformidad microbiológica.',
    severity: 'CRITICAL',
    category: 'CALIDAD & SANITARIA',
    affected_entity: 'Lote #LT-8492 (350 kg bloqueados)',
    trigger_reason: 'Ruptura de cadena de frío en transporte del proveedor antes del ingreso a bodega.',
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
    dismissed: false,
  },
];

let localApprovals = [...FALLBACK_APPROVALS];
let localAlerts = [...FALLBACK_ALERTS];

export const adminService = {
  async getFinancialDashboard(): Promise<AdminDashboardData> {
    try {
      const { data } = await api.get('/admin/dashboard');
      if (data?.kpis) {
        return data as AdminDashboardData;
      }
      return FALLBACK_DASHBOARD;
    } catch {
      return {
        ...FALLBACK_DASHBOARD,
        summary: {
          ...FALLBACK_DASHBOARD.summary,
          pending_approvals_count: localApprovals.filter((a) => a.status === 'PENDING').length,
          critical_alerts_count: localAlerts.filter((a) => !a.dismissed).length,
        },
      };
    }
  },

  async getApprovals(statusFilter?: string): Promise<{ approvals: ApprovalItem[]; pending_count: number }> {
    try {
      const { data } = await api.get('/admin/approvals', { params: { status: statusFilter } });
      const items = (data?.approvals ?? localApprovals) as ApprovalItem[];
      localApprovals = items;
      return {
        approvals: items,
        pending_count: typeof data?.pending_count === 'number' ? data.pending_count : items.filter((a) => a.status === 'PENDING').length,
      };
    } catch {
      let filtered = [...localApprovals];
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter((a) => a.status === statusFilter);
      }
      return {
        approvals: filtered,
        pending_count: localApprovals.filter((a) => a.status === 'PENDING').length,
      };
    }
  },

  async actionApproval(id: string, action: 'approve' | 'reject', comment?: string): Promise<ApprovalItem> {
    try {
      const { data } = await api.post(`/admin/approvals/${id}/action`, { action, comment });
      const updated = (pickObject(data, 'approval') as unknown) as ApprovalItem;
      if (updated) {
        localApprovals = localApprovals.map((a) => (a.id === id ? updated : a));
        return updated;
      }
    } catch {
    }

    localApprovals = localApprovals.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          status_label: action === 'approve' ? 'Autorizado' : 'Rechazado',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Administrador',
          admin_comment: comment,
        };
      }
      return item;
    });

    const found = localApprovals.find((a) => a.id === id);
    if (!found) throw new Error('Solicitud no encontrada');
    return found;
  },

  async getCriticalAlerts(): Promise<{ alerts: CriticalAlertItem[]; active_count: number }> {
    try {
      const { data } = await api.get('/admin/critical-alerts');
      const items = (data?.alerts ?? localAlerts) as CriticalAlertItem[];
      localAlerts = items;
      return {
        alerts: items,
        active_count: typeof data?.active_count === 'number' ? data.active_count : items.filter((a) => !a.dismissed).length,
      };
    } catch {
      return {
        alerts: localAlerts,
        active_count: localAlerts.filter((a) => !a.dismissed).length,
      };
    }
  },

  async dismissCriticalAlert(id: string): Promise<void> {
    try {
      await api.patch(`/admin/critical-alerts/${id}/dismiss`);
    } catch {
    }
    localAlerts = localAlerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a));
  },

  async getOperationalUsers(): Promise<OperationalUserItem[]> {
    try {
      const { data } = await api.get('/settings/users');
      if (Array.isArray(data?.users) && data.users.length > 0) {
        return data.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role_label: u.role_label ?? u.role,
          vehicle: u.vehicle ?? (u.role === 'OPERARIO_LOGISTICO' ? 'Bodega Principal' : undefined),
          is_active: u.is_active ?? true,
          phone: u.phone,
        }));
      }
    } catch {
    }
    return localOperationalUsers;
  },

  async toggleUserEmergencyStatus(userId: number): Promise<OperationalUserItem> {
    try {
      const { data } = await api.patch(`/settings/users/${userId}/status`);
      if (data?.user) {
        const u = data.user;
        const mapped: OperationalUserItem = {
          id: u.id,
          name: u.name,
          email: u.email,
          role_label: u.role_label ?? u.role,
          vehicle: u.vehicle,
          is_active: u.is_active,
          phone: u.phone,
        };
        localOperationalUsers = localOperationalUsers.map((item) => (item.id === userId ? mapped : item));
        return mapped;
      }
    } catch {
    }

    localOperationalUsers = localOperationalUsers.map((item) => {
      if (item.id === userId) {
        return { ...item, is_active: !item.is_active };
      }
      return item;
    });

    const target = localOperationalUsers.find((u) => u.id === userId);
    if (!target) throw new Error('Usuario no encontrado');
    return target;
  },

  async getStockDepletions(): Promise<StockDepletionItem[]> {
    return localStockDepletions;
  },

  async getSosSignals(): Promise<DriverSosSignal[]> {
    return localSosSignals.filter((s) => s.status === 'ACTIVE');
  },

  async resolveSosSignal(signalId: string): Promise<void> {
    localSosSignals = localSosSignals.map((s) => (s.id === signalId ? { ...s, status: 'RESOLVED' } : s));
  },
};
