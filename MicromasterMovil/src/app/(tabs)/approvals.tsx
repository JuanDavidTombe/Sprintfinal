import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing } from '@/constants/theme';
import { adminService, type ApprovalItem } from '@/services/admin.service';
import { formatMoney } from '@/utils/format';

type FilterType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all';

export default function ApprovalsScreen() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminService
      .getApprovals(filter)
      .then((data) => {
        if (active) setApprovals(data.approvals);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    adminService
      .getApprovals(filter)
      .then((data) => setApprovals(data.approvals))
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [filter]);

  const handleAction = (item: ApprovalItem, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'Autorizar' : 'Rechazar';
    const isUserReg = item.event_type === 'USER_REGISTRATION';
    const msg = isUserReg
      ? `¿Confirmas ${action === 'approve' ? 'habilitar el acceso a planta' : 'rechazar el registro'} de ${item.requester_name} (${item.requester_role})?`
      : `Estás a punto de ${action === 'approve' ? 'autorizar' : 'rechazar'} la solicitud de ${item.requester_name} por valor de ${formatMoney(item.amount)}.`;

    Alert.alert(
      `¿${actionLabel} Solicitud?`,
      msg,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setProcessingId(item.id);
            try {
              const updated = await adminService.actionApproval(item.id, action);
              setApprovals((prev) => prev.map((a) => (a.id === item.id ? updated : a)));
              Alert.alert('Éxito', action === 'approve' ? 'Solicitud autorizada correctamente' : 'Solicitud rechazada');
            } catch {
              Alert.alert('Error', 'No se pudo procesar la acción.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const pendingCount = approvals.filter((a) => a.status === 'PENDING').length;

  return (
    <Screen edges={['top']}>
      <ScreenHeader
        subtitle="Autorización de personal RBAC, cupos y mermas"
        title="Centro de Aprobaciones"
      />

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFilter('PENDING')}
          style={[styles.filterChip, filter === 'PENDING' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filter === 'PENDING' && styles.filterTextActive]}>
            Pendientes {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('all')}
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('APPROVED')}
          style={[styles.filterChip, filter === 'APPROVED' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filter === 'APPROVED' && styles.filterTextActive]}>
            Autorizadas
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter('REJECTED')}
          style={[styles.filterChip, filter === 'REJECTED' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, filter === 'REJECTED' && styles.filterTextActive]}>
            Rechazadas
          </Text>
        </Pressable>
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
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Cargando bandeja de aprobaciones…</Text>
          </View>
        ) : approvals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons color={colors.textMuted} name="checkmark-done-circle-outline" size={44} />
            <Text style={styles.emptyTitle}>Bandeja al Día</Text>
            <Text style={styles.emptySubtitle}>
              No hay solicitudes de personal ni operaciones pendientes de autorización.
            </Text>
          </Card>
        ) : (
          approvals.map((item) => {
            const isPending = item.status === 'PENDING';
            const isApproved = item.status === 'APPROVED';
            const isRejected = item.status === 'REJECTED';
            const isProcessing = processingId === item.id;
            const isUserReg = item.event_type === 'USER_REGISTRATION';

            const badgeColor = isUserReg
              ? '#A3E635'
              : item.event_type === 'CREDIT_LIMIT_EXCEEDED'
                ? '#38BDF8'
                : item.event_type === 'HIGH_VALUE_WASTE'
                  ? '#F59E0B'
                  : '#EF4444';

            const badgeIcon = isUserReg
              ? 'person-add'
              : item.event_type === 'CREDIT_LIMIT_EXCEEDED'
                ? 'card'
                : item.event_type === 'HIGH_VALUE_WASTE'
                  ? 'trash-bin'
                  : 'close-circle';

            const badgeLabel = isUserReg
              ? 'ALTA DE PERSONAL · RBAC'
              : item.event_type === 'CREDIT_LIMIT_EXCEEDED'
                ? 'CUPO CRÉDITO B2B'
                : item.event_type === 'HIGH_VALUE_WASTE'
                  ? 'MERMA PLANTA'
                  : 'ANULACIÓN RUTA';

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  isUserReg && isPending && styles.cardUserReg,
                  isApproved && styles.cardApproved,
                  isRejected && styles.cardRejected,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.typeBadge}>
                      <Ionicons color={badgeColor} name={badgeIcon as any} size={13} />
                      <Text style={[styles.typeBadgeText, { color: badgeColor }]}>
                        {badgeLabel}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isApproved && styles.statusBadgeApproved,
                        isRejected && styles.statusBadgeRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isApproved && { color: '#10B981' },
                          isRejected && { color: '#EF4444' },
                        ]}
                      >
                        {item.status_label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>

                <View style={styles.amountBox}>
                  <View style={styles.amountInfo}>
                    <Text style={styles.amountLabel}>
                      {isUserReg ? 'ROL SOLICITADO' : 'MONTO IMPLICADO (COP)'}
                    </Text>
                    <Text style={[styles.amountText, isUserReg && { fontSize: 16, color: '#A3E635' }]}>
                      {isUserReg ? item.requester_role : formatMoney(item.amount)}
                    </Text>
                  </View>
                  <View style={styles.requesterInfo}>
                    <Text style={styles.requesterLabel}>SOLICITANTE</Text>
                    <Text style={styles.requesterName}>
                      {item.requester_name.replace(/Palehor/gi, 'Palechor')}
                    </Text>
                    <Text style={styles.requesterRole}>
                      {isUserReg ? (item.target_client ?? 'Nuevo Ingreso') : item.requester_role}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <Ionicons color={colors.textMuted} name="information-circle-outline" size={16} />
                  <Text style={styles.detailsText}>{item.details}</Text>
                </View>

                {isPending ? (
                  <View style={styles.actionsRow}>
                    <Pressable
                      disabled={isProcessing}
                      onPress={() => handleAction(item, 'approve')}
                      style={({ pressed }) => [
                        styles.btnApprove,
                        pressed && styles.btnApprovePressed,
                      ]}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons color="#FFFFFF" name="checkmark-circle" size={18} />
                          <Text style={styles.btnApproveText}>
                            {isUserReg ? 'Habilitar Acceso' : 'Autorizar'}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      disabled={isProcessing}
                      onPress={() => handleAction(item, 'reject')}
                      style={({ pressed }) => [
                        styles.btnReject,
                        pressed && styles.btnRejectPressed,
                      ]}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons color="#FFFFFF" name="close-circle" size={18} />
                          <Text style={styles.btnRejectText}>Rechazar</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.resolutionBox}>
                    <Ionicons
                      color={isApproved ? '#10B981' : '#EF4444'}
                      name={isApproved ? 'shield-checkmark' : 'shield-half'}
                      size={15}
                    />
                    <Text style={styles.resolutionText}>
                      {isApproved
                        ? `Autorizado por ${item.reviewed_by ?? 'Administrador'}`
                        : `Rechazado por ${item.reviewed_by ?? 'Administrador'}`}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 3,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  scroll: {
    padding: spacing.sm + 4,
    gap: spacing.sm + 4,
    paddingBottom: spacing.xl + 12,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.lg + 4,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm + 6,
    gap: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardUserReg: {
    borderColor: 'rgba(163, 230, 53, 0.55)',
  },
  cardApproved: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: '#0F1E19',
  },
  cardRejected: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    opacity: 0.88,
  },
  cardHeader: {
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  itemDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountInfo: {
    gap: 2,
    flex: 1,
  },
  amountLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountText: {
    color: '#10B981',
    fontSize: 19,
    fontWeight: '900',
  },
  requesterInfo: {
    alignItems: 'flex-end',
    gap: 1,
  },
  requesterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  requesterName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  requesterRole: {
    color: colors.textMuted,
    fontSize: 11,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  detailsText: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  btnApprove: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
  },
  btnApprovePressed: {
    backgroundColor: '#059669',
    transform: [{ scale: 0.98 }],
  },
  btnApproveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
  },
  btnRejectPressed: {
    backgroundColor: '#B91C1C',
    transform: [{ scale: 0.98 }],
  },
  btnRejectText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  resolutionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
