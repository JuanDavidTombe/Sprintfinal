import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { SosModal } from '@/components/SosModal';
import { StatusPill } from '@/components/StatusPill';
import { isAdmin, isWarehouseOperator } from '@/constants/roles';
import { colors, radius, spacing } from '@/constants/theme';
import { useSession } from '@/context/AuthContext';
import {
  adminService,
  type AdminDashboardData,
  type ApprovalItem,
  type DriverSosSignal,
  type OperationalUserItem,
  type StockDepletionItem,
} from '@/services/admin.service';
import { deliveryService } from '@/services/delivery.service';
import { offlineService } from '@/services/offline.service';
import { warehouseService, type WarehouseHubData } from '@/services/warehouse.service';
import type { DeliveryOrder, User } from '@/types/models';
import { formatMoney, statusTone } from '@/utils/format';

export default function HomeScreen() {
  const { user } = useSession();

  if (isAdmin(user)) {
    return <AdminFinancialHomeScreen user={user} />;
  }

  if (isWarehouseOperator(user)) {
    return <WarehouseActionHubScreen user={user} />;
  }

  return <DriverHomeScreen user={user} />;
}

function AdminFinancialHomeScreen({ user }: { user: User | null }) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [depletions, setDepletions] = useState<StockDepletionItem[]>([]);
  const [sosSignals, setSosSignals] = useState<DriverSosSignal[]>([]);
  const [users, setUsers] = useState<OperationalUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [dashRes, appRes, depRes, sosRes, usrRes] = await Promise.all([
      adminService.getFinancialDashboard().catch(() => null),
      adminService.getApprovals('PENDING').then((res) => res.approvals).catch(() => []),
      adminService.getStockDepletions().catch(() => []),
      adminService.getSosSignals().catch(() => []),
      adminService.getOperationalUsers().catch(() => []),
    ]);

    return { dashRes, appRes, depRes, sosRes, usrRes };
  }, []);

  useEffect(() => {
    let active = true;

    fetchAll()
      .then(({ dashRes, appRes, depRes, sosRes, usrRes }) => {
        if (!active) return;
        if (dashRes) setData(dashRes);
        if (appRes) setApprovals(appRes);
        if (depRes) setDepletions(depRes);
        if (sosRes) setSosSignals(sosRes);
        if (usrRes) setUsers(usrRes);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll()
      .then(({ dashRes, appRes, depRes, sosRes, usrRes }) => {
        if (dashRes) setData(dashRes);
        if (appRes) setApprovals(appRes);
        if (depRes) setDepletions(depRes);
        if (sosRes) setSosSignals(sosRes);
        if (usrRes) setUsers(usrRes);
      })
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [fetchAll]);

  const handleApprovalAction = async (
    item: ApprovalItem,
    action: 'approve' | 'reject',
    label: string
  ) => {
    setActionLoadingId(item.id);
    try {
      await adminService.actionApproval(item.id, action);
      setApprovals((prev) => prev.filter((a) => a.id !== item.id));
      Alert.alert(
        action === 'approve' ? '✔️ Acción Ejecutada' : '❌ Petición Rechazada/Retenida',
        `Se ha procesado exitosamente: "${label}"`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo procesar la aprobación');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveSos = async (signal: DriverSosSignal) => {
    setActionLoadingId(`sos-${signal.id}`);
    try {
      await adminService.resolveSosSignal(signal.id);
      setSosSignals((prev) => prev.filter((s) => s.id !== signal.id));
      Alert.alert('✔️ Emergencia Atendida', `Se cerró la alerta de ${signal.driver_name}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo cerrar la alerta');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCallDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('No se pudo abrir el marcador', `Número: ${phone}`);
    });
  };

  const handleToggleUserStatus = async (targetUser: OperationalUserItem) => {
    const nextStatus = !targetUser.is_active;
    const actionWord = nextStatus ? 'REACTIVAR' : 'SUSPENDER ACCESO A';

    Alert.alert(
      '⚠️ Confirmación de Seguridad',
      `¿Estás seguro de que deseas ${actionWord} ${targetUser.name} (${targetUser.role_label})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: nextStatus ? 'Reactivar' : 'Suspender Acceso',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const updated = await adminService.toggleUserEmergencyStatus(targetUser.id);
              setUsers((prev) =>
                prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: updated.is_active } : u))
              );
              Alert.alert(
                updated.is_active ? '🟢 Usuario Activo' : '🔴 ACCESO SUSPENDIDO',
                `El usuario ${targetUser.name} ha sido ${updated.is_active ? 'reactivado' : 'suspendido inmediatamente'}.`
              );
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo modificar el acceso del usuario');
            }
          },
        },
      ]
    );
  };

  const adminFullName = user?.name?.trim() ? user.name : 'María Camila Palechor';
  const routesCompleted = data?.kpis?.routes_completed ?? 4;
  const routesTotal = data?.kpis?.routes_total ?? 5;
  const routePercent = Math.min(100, Math.round((routesCompleted / Math.max(1, routesTotal)) * 100));

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.adminHeaderCard}>
          <View style={styles.adminHeaderTop}>
            <View style={styles.adminAvatarBox}>
              <Ionicons color="#10B981" name="shield-checkmark" size={28} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.adminHeaderName}>
                {adminFullName}
              </Text>
              <Text style={styles.adminHeaderRole}>
                👑 Administrador de Planta & Operaciones
              </Text>
            </View>
            <View style={styles.liveIndicatorPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveIndicatorText}>EN VIVO</Text>
            </View>
          </View>
          <View style={styles.adminHeaderBottom}>
            <Ionicons color="#94A3B8" name="hardware-chip-outline" size={14} />
            <Text style={styles.adminHeaderTagline}>
              Centro de Mando Gerencial · Control Móvil de Respuesta Rápida
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Sincronizando Centro de Mando…</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeaderBox}>
              <Ionicons color="#38BDF8" name="speedometer-outline" size={18} />
              <Text style={styles.sectionHeaderTitle}>TERMÓMETRO FINANCIERO & OPERATIVO</Text>
            </View>

            <View style={styles.financialCardsCol}>
              <View style={[styles.cmdCard, styles.cmdCardCash]}>
                <View style={styles.cmdCardHead}>
                  <View style={[styles.cmdIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <Ionicons color="#10B981" name="cash" size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cmdCardLabel, { color: '#10B981' }]}>
                      EFECTIVO TOTAL RECAUDADO EN CALLE
                    </Text>
                    <Text style={styles.cmdCardSub}>Sincronizado con cobros de repartidores</Text>
                  </View>
                </View>
                <Text style={styles.cmdCardAmount}>
                  {formatMoney(data?.kpis?.cash_in_street ?? 2840000)}
                </Text>
                <View style={styles.cmdCardFoot}>
                  <Ionicons color="#10B981" name="checkmark-done-circle" size={15} />
                  <Text style={styles.cmdCardFootText}>
                    Dinero físico conciliado y en tránsito en ruta
                  </Text>
                </View>
              </View>

              <View style={[styles.cmdCard, styles.cmdCardRoutes]}>
                <View style={styles.cmdCardHead}>
                  <View style={[styles.cmdIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                    <Ionicons color="#38BDF8" name="navigate" size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cmdCardLabel, { color: '#38BDF8' }]}>
                      AVANCE GLOBAL DE RUTAS
                    </Text>
                    <Text style={styles.cmdCardSub}>
                      {routesCompleted} de {routesTotal} Rutas Completadas ({routePercent}%)
                    </Text>
                  </View>
                  <View style={styles.routePercentBadge}>
                    <Text style={styles.routePercentBadgeText}>{routePercent}%</Text>
                  </View>
                </View>

                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${routePercent}%` }]} />
                </View>

                <View style={styles.cmdCardFoot}>
                  <Ionicons color="#38BDF8" name="trail-sign-outline" size={15} />
                  <Text style={styles.cmdCardFootText}>
                    4 rutas cerradas · 1 vehículo completando entregas
                  </Text>
                </View>
              </View>

              <View style={[styles.cmdCard, styles.cmdCardInventory]}>
                <View style={styles.cmdCardHead}>
                  <View style={[styles.cmdIconBox, { backgroundColor: 'rgba(129, 140, 248, 0.2)' }]}>
                    <Ionicons color="#818CF8" name="cube" size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cmdCardLabel, { color: '#818CF8' }]}>
                      CAPITAL ACTIVO EN BODEGA
                    </Text>
                    <Text style={styles.cmdCardSub}>Valoración ponderada de existencias físicas</Text>
                  </View>
                </View>
                <Text style={styles.cmdCardAmount}>
                  {formatMoney(data?.kpis?.inventory_value ?? 14250000)}
                </Text>
                <View style={styles.cmdCardFoot}>
                  <Ionicons color="#818CF8" name="layers-outline" size={15} />
                  <Text style={styles.cmdCardFootText}>
                    Materia prima + producto terminado valorizado
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeaderBox}>
              <Ionicons color="#F59E0B" name="flash" size={18} />
              <Text style={styles.sectionHeaderTitle}>
                APROBACIONES EN CALIENTE (RESPUESTA INMEDIATA)
              </Text>
              {approvals.length > 0 ? (
                <View style={styles.pendingCountPill}>
                  <Text style={styles.pendingCountPillText}>{approvals.length}</Text>
                </View>
              ) : null}
            </View>

            {approvals.length === 0 ? (
              <View style={styles.emptyApprovalsCard}>
                <Ionicons color="#10B981" name="checkmark-circle" size={32} />
                <Text style={styles.emptyApprovalsTitle}>Sin peticiones pendientes</Text>
                <Text style={styles.emptyApprovalsSub}>
                  No hay mermas críticas, excepciones de crédito ni anulaciones retenidas.
                </Text>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                {approvals.map((item) => {
                  const isBusy = actionLoadingId === item.id;
                  const isWaste = item.event_type === 'HIGH_VALUE_WASTE';
                  const isCredit = item.event_type === 'CREDIT_LIMIT_EXCEEDED';
                  const isCancel = item.event_type === 'INVOICE_CANCELLATION';

                  let approveText = '✔️ Aprobar';
                  let rejectText = '❌ Rechazar';
                  let badgeLabel = 'SOLICITUD';
                  let badgeColor = '#38BDF8';

                  if (isWaste) {
                    approveText = '✔️ Aprobar Baja';
                    rejectText = '❌ Retener para Auditoría';
                    badgeLabel = 'MERMA DE ALTO VALOR';
                    badgeColor = '#EF4444';
                  } else if (isCredit) {
                    approveText = '✔️ Autorizar Crédito';
                    rejectText = '❌ Rechazar Crédito';
                    badgeLabel = 'EXCEPCIÓN DE RUTA: CRÉDITO';
                    badgeColor = '#F59E0B';
                  } else if (isCancel) {
                    approveText = '✔️ Autorizar Anulación';
                    rejectText = '❌ Exigir Entrega';
                    badgeLabel = 'EXCEPCIÓN EN RUTA: ANULACIÓN';
                    badgeColor = '#EC4899';
                  }

                  return (
                    <View key={item.id} style={styles.approvalHotCard}>
                      <View style={styles.approvalHotHead}>
                        <View style={[styles.approvalTypeBadge, { backgroundColor: `${badgeColor}22`, borderColor: badgeColor }]}>
                          <Text style={[styles.approvalTypeBadgeText, { color: badgeColor }]}>
                            {badgeLabel}
                          </Text>
                        </View>
                        <Text style={styles.approvalHotTime}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Reciente'}
                        </Text>
                      </View>

                      <Text style={styles.approvalHotTitle}>{item.title}</Text>
                      <Text style={styles.approvalHotDesc}>{item.description}</Text>

                      <View style={styles.approvalHotMetaRow}>
                        <View style={styles.approvalMetaItem}>
                          <Ionicons color="#94A3B8" name="person-outline" size={13} />
                          <Text style={styles.approvalMetaText}>{item.requester_name}</Text>
                        </View>
                        {item.amount && item.amount > 0 ? (
                          <View style={styles.approvalMetaItem}>
                            <Ionicons color="#F59E0B" name="pricetag-outline" size={13} />
                            <Text style={styles.approvalMetaAmount}>{formatMoney(item.amount)}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.giantActionRow}>
                        <Pressable
                          disabled={isBusy}
                          style={({ pressed }) => [
                            styles.giantActionBtn,
                            styles.giantActionReject,
                            pressed && styles.giantActionPressed,
                            isBusy && { opacity: 0.5 },
                          ]}
                          onPress={() => handleApprovalAction(item, 'reject', rejectText)}
                        >
                          {isBusy ? (
                            <ActivityIndicator color="#EF4444" size="small" />
                          ) : (
                            <Text style={styles.giantActionRejectText}>{rejectText}</Text>
                          )}
                        </Pressable>

                        <Pressable
                          disabled={isBusy}
                          style={({ pressed }) => [
                            styles.giantActionBtn,
                            styles.giantActionApprove,
                            pressed && styles.giantActionPressed,
                            isBusy && { opacity: 0.5 },
                          ]}
                          onPress={() => handleApprovalAction(item, 'approve', approveText)}
                        >
                          {isBusy ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.giantActionApproveText}>{approveText}</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.sectionHeaderBox}>
              <Ionicons color="#EF4444" name="shield-outline" size={18} />
              <Text style={[styles.sectionHeaderTitle, { color: '#EF4444' }]}>
                PANEL DE ALERTAS ROJAS & SEGURIDAD (S.O.S.)
              </Text>
            </View>

            <View style={styles.sosBlock}>
              <View style={styles.sosBlockHead}>
                <Ionicons color="#EF4444" name="alert-circle" size={18} />
                <Text style={styles.sosBlockTitle}>Quiebres de Stock Crítico (0 unidades/kg)</Text>
              </View>
              <Text style={styles.sosBlockSub}>
                Insumos agotados que pueden paralizar líneas de producción:
              </Text>

              <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                {depletions.map((dep) => (
                  <View key={dep.id} style={styles.depletionCard}>
                    <View style={styles.depletionIconBox}>
                      <Ionicons color="#EF4444" name="close-circle" size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.depletionName}>{dep.name}</Text>
                      <Text style={styles.depletionSub}>
                        Stock actual: <Text style={styles.zeroStock}>{dep.current_stock} {dep.unit}</Text> · Afecta {dep.affected_orders} Órdenes ({dep.criticality === 'CRITICAL' ? '¡Crítico!' : 'Riesgo alto'})
                      </Text>
                    </View>
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>0 {dep.unit}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sosBlock}>
              <View style={styles.sosBlockHead}>
                <Ionicons color="#EF4444" name="warning" size={18} />
                <Text style={styles.sosBlockTitle}>Alertas S.O.S. en Carretera</Text>
                {sosSignals.length > 0 ? (
                  <View style={styles.sosCountBadge}>
                    <Text style={styles.sosCountBadgeText}>{sosSignals.length} ACTIVAS</Text>
                  </View>
                ) : null}
              </View>

              {sosSignals.length === 0 ? (
                <View style={styles.emptySosBox}>
                  <Ionicons color="#10B981" name="checkmark-done" size={24} />
                  <Text style={styles.emptySosText}>No hay emergencias de conductores en curso</Text>
                </View>
              ) : (
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  {sosSignals.map((sig) => {
                    const isBusy = actionLoadingId === `sos-${sig.id}`;
                    return (
                      <View key={sig.id} style={styles.sosSignalCard}>
                        <View style={styles.sosSignalHead}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.sosSignalDriver}>
                              🚨 {sig.driver_name} · <Text style={{ color: '#38BDF8' }}>{sig.vehicle}</Text>
                            </Text>
                            <Text style={styles.sosSignalLocation}>📍 {sig.location}</Text>
                          </View>
                          <Text style={styles.sosSignalTime}>{sig.timestamp}</Text>
                        </View>

                        <View style={styles.sosReasonBox}>
                          <Text style={styles.sosReasonLabel}>Motivo Reportado:</Text>
                          <Text style={styles.sosReasonText}>{sig.reason}</Text>
                        </View>

                        <View style={styles.sosActionRow}>
                          <Pressable
                            style={styles.sosCallBtn}
                            onPress={() => handleCallDriver(sig.phone)}
                          >
                            <Ionicons color="#FFFFFF" name="call" size={15} />
                            <Text style={styles.sosCallBtnText}>Llamar ({sig.phone})</Text>
                          </Pressable>

                          <Pressable
                            disabled={isBusy}
                            style={styles.sosResolveBtn}
                            onPress={() => handleResolveSos(sig)}
                          >
                            {isBusy ? (
                              <ActivityIndicator color="#10B981" size="small" />
                            ) : (
                              <>
                                <Ionicons color="#10B981" name="checkmark" size={15} />
                                <Text style={styles.sosResolveBtnText}>Atendida</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.sosBlock}>
              <View style={styles.sosBlockHead}>
                <Ionicons color="#F59E0B" name="power" size={18} />
                <Text style={styles.sosBlockTitle}>Switch de Emergencia · Bloqueo de Acceso</Text>
              </View>
              <Text style={styles.sosBlockSub}>
                Suspende temporalmente el acceso móvil a conductores u operarios ante incidencias graves o auditorías:
              </Text>

              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {users.map((u) => {
                  return (
                    <View
                      key={u.id}
                      style={[
                        styles.userSwitchRow,
                        !u.is_active && styles.userSwitchRowSuspended,
                      ]}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.userName}>{u.name}</Text>
                          <View
                            style={[
                              styles.userStatusPill,
                              u.is_active ? styles.userPillActive : styles.userPillSuspended,
                            ]}
                          >
                            <Text
                              style={[
                                styles.userStatusPillText,
                                u.is_active ? { color: '#10B981' } : { color: '#EF4444' },
                              ]}
                            >
                              {u.is_active ? 'ACTIVO' : 'SUSPENDIDO'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.userRoleText}>
                          {u.role_label} · {u.vehicle ?? 'Planta Central'}
                        </Text>
                      </View>

                      <Switch
                        disabled={false}
                        thumbColor={u.is_active ? '#10B981' : '#EF4444'}
                        trackColor={{ false: '#3B1818', true: '#0E3A28' }}
                        value={u.is_active}
                        onValueChange={() => handleToggleUserStatus(u)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </Screen>
  );
}

function WarehouseActionHubScreen({ user }: { user: User | null }) {
  const [hubData, setHubData] = useState<WarehouseHubData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    warehouseService
      .getHub()
      .then((res) => {
        if (active) setHubData(res);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    warehouseService
      .getHub()
      .then((res) => setHubData(res))
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'Auxiliar';

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.warehouseScroll}
        refreshControl={
          <RefreshControl
            colors={['#10B981']}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.whHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.whGreeting}>Hola, {firstName}</Text>
            <Text style={styles.whSub}>Muelle Principal · Turno Bodega Activo</Text>
          </View>
          <View style={styles.whRoleBadge}>
            <Ionicons color="#38BDF8" name="cube" size={16} />
            <Text style={styles.whRoleText}>BODEGA</Text>
          </View>
        </View>

        <View style={styles.whButtonsContainer}>
          <Pressable
            onPress={() => router.push('/warehouse/picking')}
            style={({ pressed }) => [
              styles.whGiantBtn,
              styles.whBtnDispatch,
              pressed && styles.whGiantBtnPressed,
            ]}
          >
            <View style={styles.whBtnContent}>
              <View style={[styles.whBtnIconBox, { backgroundColor: '#1E3A8A' }]}>
                <Ionicons color="#60A5FA" name="cube" size={36} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.whBtnTopRow}>
                  <Text style={styles.whBtnTitle}>📦 ALISTAMIENTO</Text>
                  <View style={styles.whBadgeBlue}>
                    <Text style={styles.whBadgeBlueText}>
                      {hubData?.counts?.pickings ?? 3} Pedidos
                    </Text>
                  </View>
                </View>
                <Text style={styles.whBtnSub}>
                  Checklist por cliente sin escáner. Despacho rápido en estiba y descuento automático.
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/warehouse/audit-select')}
            style={({ pressed }) => [
              styles.whGiantBtn,
              styles.whBtnAudit,
              pressed && styles.whGiantBtnPressed,
            ]}
          >
            <View style={styles.whBtnContent}>
              <View style={[styles.whBtnIconBox, { backgroundColor: '#78350F' }]}>
                <Ionicons color="#FBBF24" name="clipboard" size={36} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.whBtnTopRow}>
                  <Text style={styles.whBtnTitle}>📋 AUDITORÍA</Text>
                  <View style={styles.whBadgeAmber}>
                    <Text style={styles.whBadgeAmberText}>Bifurcación Limpia</Text>
                  </View>
                </View>
                <Text style={styles.whBtnSub}>
                  ¿Qué área vas a auditar? Insumos (Modo Báscula) o Producto Terminado (Modo Conteo).
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

function DriverHomeScreen({ user }: { user: User | null }) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [cashTally, setCashTally] = useState<number>(0);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const localOrders = await offlineService.getOrders();
      const localCash = await offlineService.getCashTally();
      const pendingCount = await offlineService.getPendingCount();

      setOrders(localOrders);
      setCashTally(localCash);
      setPendingSyncCount(pendingCount);

      try {
        const result = await deliveryService.getOrders();
        if (result?.orders && result.orders.length > 0) {
          await offlineService.saveOrders(result.orders);
          setOrders(result.orders);
        }
      } catch {
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = offlineService.subscribe(() => {
      void loadData();
    });
    return unsubscribe;
  }, [loadData]);

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    try {
      await offlineService.syncOutbox();
      const pending = await offlineService.getPendingCount();
      setPendingSyncCount(pending);
    } finally {
      setSyncing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
    void handleManualSync();
  }, [loadData, handleManualSync]);

  const openWaze = (order: DeliveryOrder) => {
    const lat = order.latitude ?? 6.2088;
    const lng = order.longitude ?? -75.5658;
    const query = encodeURIComponent(order.destination ?? order.client_name ?? '');

    const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
    const mapsUrl =
      Platform.OS === 'ios'
        ? `maps://?daddr=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${query})`;

    Linking.canOpenURL(wazeUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(wazeUrl);
        }
        return Linking.openURL(mapsUrl);
      })
      .catch(() => {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        ).catch(() => undefined);
      });
  };

  const openOrderDetail = (orderId: number | string) => {
    router.push({
      pathname: '/orders_delivery/[id]',
      params: { id: String(orderId) },
    });
  };

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
  const pendingOrders = totalOrders - completedOrders - cancelledOrders;
  const progressPercent = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  const firstName = user?.name?.split(' ')[0] ?? 'Conductor';

  return (
    <Screen edges={['top']}>
      <View
        style={[
          styles.syncBanner,
          pendingSyncCount > 0 ? styles.syncBannerPending : styles.syncBannerOk,
        ]}
      >
        <View style={styles.syncBannerLeft}>
          <Ionicons
            color={pendingSyncCount > 0 ? '#F59E0B' : '#10B981'}
            name={pendingSyncCount > 0 ? 'cloud-offline' : 'cloud-done'}
            size={18}
          />
          <Text style={styles.syncBannerText}>
            {pendingSyncCount > 0
              ? `${pendingSyncCount} acción(es) pendiente(s) de sincronizar (Offline)`
              : 'Base de datos sincronizada con la oficina'}
          </Text>
        </View>
        {pendingSyncCount > 0 ? (
          <Pressable
            disabled={syncing}
            onPress={handleManualSync}
            style={styles.syncButton}
          >
            {syncing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.syncButtonText}>Sincronizar</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {firstName}</Text>
            <Text style={styles.routeLabel}>Ruta Activa: Centro - Sur</Text>
          </View>
          <View style={styles.driverBadge}>
            <Ionicons color={colors.primary} name="shield-checkmark" size={16} />
            <Text style={styles.driverBadgeText}>EN RUTA</Text>
          </View>
        </View>

        <View style={styles.cashCard}>
          <View style={styles.cashTopRow}>
            <View style={styles.cashIconBox}>
              <Ionicons color="#10B981" name="wallet" size={28} />
            </View>
            <View style={styles.cashTitleBox}>
              <Text style={styles.cashLabel}>ARQUEO DE BOLSILLO</Text>
              <Text style={styles.cashSubtitle}>
                Efectivo físico a entregar al supervisor
              </Text>
            </View>
          </View>

          <View style={styles.cashAmountBox}>
            <Text style={styles.cashAmount}>{formatMoney(cashTally)}</Text>
          </View>

          <View style={styles.cashFooter}>
            <View style={styles.cashTipRow}>
              <Ionicons color="#10B981" name="checkmark-circle" size={16} />
              <Text style={styles.cashTip}>
                Cuadre instantáneo en cangurera al volver a base
              </Text>
            </View>
          </View>
        </View>

        <Card style={styles.progressCard}>
          <View style={styles.progressHead}>
            <View>
              <Text style={styles.progressTitle}>Progreso del Día</Text>
              <Text style={styles.progressSubtitle}>
                Entregas completadas: <Text style={styles.highlight}>{completedOrders}</Text> de {totalOrders}
              </Text>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>{progressPercent}%</Text>
            </View>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progressPercent, 100)}%` },
              ]}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {completedOrders}
              </Text>
              <Text style={styles.statLabel}>Entregados</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {pendingOrders}
              </Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {cancelledOrders}
              </Text>
              <Text style={styles.statLabel}>Novedad/Rechazo</Text>
            </View>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Entregas Asignadas Hoy</Text>
          <Text style={styles.sectionCount}>{orders.length} clientes</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Cargando ruta de hoy…</Text>
          </View>
        ) : (
          orders.map((order, index) => {
            const isDelivered = order.status === 'delivered';
            const isCancelled = order.status === 'cancelled';

            return (
              <Pressable
                key={String(order.id ?? index)}
                onPress={() => openOrderDetail(order.id)}
                style={({ pressed }) => [
                  styles.orderCard,
                  isDelivered && styles.orderCardDelivered,
                  isCancelled && styles.orderCardCancelled,
                  pressed && styles.orderCardPressed,
                ]}
              >
                <View style={styles.orderTopRow}>
                  <View style={styles.orderIndexBadge}>
                    <Text style={styles.orderIndexText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {order.client_name ?? `Pedido #${order.id}`}
                    </Text>
                    <Text style={styles.clientAddress} numberOfLines={2}>
                      {order.destination ?? 'Dirección sin especificar'}
                    </Text>
                  </View>
                  <StatusPill
                    label={
                      isDelivered
                        ? 'Entregado'
                        : isCancelled
                          ? 'Cancelado'
                          : 'Pendiente'
                    }
                    tone={statusTone(order.status)}
                  />
                </View>

                <View style={styles.orderBottomRow}>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Monto a cobrar:</Text>
                    <Text style={styles.orderAmount}>
                      {formatMoney(order.amount)}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        openWaze(order);
                      }}
                      style={styles.wazeSmallButton}
                    >
                      <Ionicons color="#38BDF8" name="navigate" size={16} />
                      <Text style={styles.wazeSmallText}>Waze</Text>
                    </Pressable>

                    <View
                      style={[
                        styles.openDetailButton,
                        isDelivered ? styles.openDetailButtonDelivered : styles.openDetailButtonPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.openDetailText,
                          isDelivered ? styles.openDetailTextDelivered : styles.openDetailTextPending,
                        ]}
                      >
                        {isDelivered ? 'Ver Remisión' : 'Entregar >'}
                      </Text>
                      <Ionicons
                        color={isDelivered ? '#94A3B8' : '#FFFFFF'}
                        name={isDelivered ? 'document-text-outline' : 'chevron-forward'}
                        size={16}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.floatingSosContainer}>
        <Pressable
          onPress={() => setSosVisible(true)}
          style={({ pressed }) => [
            styles.sosButton,
            pressed && styles.sosButtonPressed,
          ]}
        >
          <View style={styles.sosPulseIcon}>
            <Ionicons color="#FFFFFF" name="alert-circle" size={28} />
          </View>
          <View style={styles.sosTextBox}>
            <Text style={styles.sosTitle}>BOTÓN S.O.S.</Text>
            <Text style={styles.sosSubtitle}>Pánico Logístico Inmediato</Text>
          </View>
          <Ionicons color="#FFFFFF" name="chevron-forward" size={24} />
        </Pressable>
      </View>

      <SosModal onClose={() => setSosVisible(false)} visible={sosVisible} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  adminGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  adminSub: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  adminHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: spacing.sm,
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  adminHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  adminAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminHeaderName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  adminHeaderRole: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveIndicatorText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  adminHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.xs,
  },
  adminHeaderTagline: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },

  sectionHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
    flex: 1,
  },
  pendingCountPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  pendingCountPillText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },

  financialCardsCol: {
    gap: spacing.md,
  },
  cmdCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1.5,
    elevation: 3,
  },
  cmdCardCash: {
    backgroundColor: '#0A1C16',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cmdCardRoutes: {
    backgroundColor: '#0A1726',
    borderColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cmdCardInventory: {
    backgroundColor: '#12122B',
    borderColor: '#818CF8',
    shadowColor: '#818CF8',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cmdCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cmdIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cmdCardLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cmdCardSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  cmdCardAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  cmdCardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.xs,
  },
  cmdCardFootText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  routePercentBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routePercentBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '900',
  },

  emptyApprovalsCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyApprovalsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyApprovalsSub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  approvalHotCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#334155',
    gap: spacing.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  approvalHotHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approvalTypeBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  approvalTypeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  approvalHotTime: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  approvalHotTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  approvalHotDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  approvalHotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  approvalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  approvalMetaText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  approvalMetaAmount: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '900',
  },
  giantActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  giantActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giantActionPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  giantActionReject: {
    backgroundColor: '#3B1818',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  giantActionRejectText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  giantActionApprove: {
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  giantActionApproveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  sosBlock: {
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sosBlockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sosBlockTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  sosBlockSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  depletionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#1E1418',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  depletionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depletionName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  depletionSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  zeroStock: {
    color: '#EF4444',
    fontWeight: '900',
  },
  urgentBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  sosCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  sosCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  emptySosBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  emptySosText: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
  },
  sosSignalCard: {
    backgroundColor: '#261215',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  sosSignalHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sosSignalDriver: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sosSignalLocation: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  sosSignalTime: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  sosReasonBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: spacing.xs + 2,
    borderRadius: radius.md,
  },
  sosReasonLabel: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sosReasonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
  sosActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  sosCallBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  sosCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sosResolveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  sosResolveBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },

  userSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userSwitchRowSuspended: {
    borderColor: '#EF4444',
    backgroundColor: '#261215',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  userRoleText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  userStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  userPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  userPillSuspended: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  userStatusPillText: {
    fontSize: 9,
    fontWeight: '900',
  },

  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderBottomWidth: 1,
  },
  syncBannerOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  syncBannerPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  syncBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  syncBannerText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  syncButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  greeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  routeLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  driverBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  cashCard: {
    backgroundColor: '#0F1E19',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cashTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cashIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashTitleBox: {
    flex: 1,
  },
  cashLabel: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cashSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cashAmountBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  cashAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cashFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
    paddingTop: spacing.xs,
  },
  cashTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashTip: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
  },
  progressCard: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  progressSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  highlight: {
    color: colors.primary,
    fontWeight: '800',
  },
  percentBadge: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
  },
  percentText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  orderCardDelivered: {
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    opacity: 0.8,
  },
  orderCardCancelled: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    opacity: 0.85,
  },
  orderCardPressed: {
    transform: [{ scale: 0.99 }],
    borderColor: colors.primary,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  orderIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderIndexText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  clientInfo: {
    flex: 1,
    gap: 3,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  clientAddress: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  orderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  amountBox: {
    gap: 2,
  },
  amountLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  orderAmount: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wazeSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  wazeSmallText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  openDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  openDetailButtonPending: {
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  openDetailButtonDelivered: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
  },
  openDetailText: {
    fontSize: 13,
    fontWeight: '800',
  },
  openDetailTextPending: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  openDetailTextDelivered: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  floatingSosContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: radius.xl,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    shadowColor: '#DC2626',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  sosButtonPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.98 }],
  },
  sosPulseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextBox: {
    flex: 1,
  },
  sosTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '600',
  },

  warehouseScroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  whHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  whGreeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  whSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  whRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  whRoleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  whButtonsContainer: {
    gap: 16,
    marginTop: spacing.xs,
  },
  whGiantBtn: {
    borderRadius: radius.xl,
    padding: spacing.md,
    minHeight: 124,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  whGiantBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  whBtnReception: {
    backgroundColor: '#059669',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  whBtnDispatch: {
    backgroundColor: '#1D4ED8',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  whBtnAudit: {
    backgroundColor: '#B45309',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  whBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  whBtnIconBox: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whBtnTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  whBtnTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  whBtnSub: {
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  whBadgeGreen: {
    backgroundColor: 'rgba(4, 120, 87, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  whBadgeGreenText: {
    color: '#D1FAE5',
    fontSize: 11,
    fontWeight: '800',
  },
  whBadgeBlue: {
    backgroundColor: 'rgba(30, 58, 138, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  whBadgeBlueText: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '800',
  },
  whBadgeAmber: {
    backgroundColor: 'rgba(120, 53, 15, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  whBadgeAmberText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '800',
  },
});
