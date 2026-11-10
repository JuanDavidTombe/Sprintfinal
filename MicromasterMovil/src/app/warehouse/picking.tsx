import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/constants/theme';
import {
  warehouseService,
  type ApprovedPickingItem,
  type ApprovedPickingOrder,
} from '@/services/warehouse.service';

export default function WarehousePickingScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<ApprovedPickingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ApprovedPickingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemStatuses, setItemStatuses] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    let active = true;
    warehouseService
      .getApprovedPickingOrders()
      .then((res) => {
        if (active) {
          setOrders(res);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSelectOrder = (order: ApprovedPickingOrder) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
    }
    setSelectedOrder(order);
    const initialStatuses: Record<string, boolean> = {};
    order.items.forEach((item) => {
      initialStatuses[item.id] = item.ready;
    });
    setItemStatuses(initialStatuses);
  };

  const handleToggleItemReady = (itemId: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    }
    setItemStatuses((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;

    const allReady = selectedOrder.items.every((it) => itemStatuses[it.id]);
    if (!allReady) {
      Alert.alert(
        'Ítems Pendientes',
        'Aún faltan productos por marcar como listos en la estiba. Completa la lista antes de descontar inventario.'
      );
      return;
    }

    Alert.alert(
      'Completar Alistamiento',
      `¿Confirmas que la estiba del pedido ${selectedOrder.order_number} está lista? El inventario se descontará automáticamente de la bodega.`,
      [
        { text: 'Revisar estiba', style: 'cancel' },
        {
          text: 'Completar y Descontar',
          style: 'destructive',
          onPress: async () => {
            setCompleting(true);
            try {
              const res = await warehouseService.completeOrderPicking(selectedOrder.id);
              Alert.alert('¡Alistamiento Completado!', res.message, [
                {
                  text: 'Volver a Pedidos',
                  onPress: () => {
                    setOrders((prev) =>
                      prev.map((o) =>
                        o.id === selectedOrder.id
                          ? { ...o, status: 'COMPLETED', pallet_ready: true }
                          : o
                      )
                    );
                    setSelectedOrder(null);
                  },
                },
              ]);
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#38BDF8" size="large" />
        <Text style={styles.loadingText}>Cargando pedidos aprobados para alistamiento...</Text>
      </View>
    );
  }

  if (selectedOrder) {
    const totalItems = selectedOrder.items.length;
    const readyItemsCount = selectedOrder.items.filter((it) => itemStatuses[it.id]).length;
    const allItemsReady = totalItems > 0 && readyItemsCount === totalItems;
    const progressPercent = Math.round((readyItemsCount / totalItems) * 100);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelectedOrder(null)} style={styles.backBtn}>
            <Ionicons color="#FFFFFF" name="arrow-back" size={24} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.headerCustomerTitle}>
              Cliente: {selectedOrder.customer_name}
            </Text>
            <Text style={styles.headerSub}>
              Pedido {selectedOrder.order_number} · Checklist de Estiba
            </Text>
          </View>
          <View style={styles.badgePicking}>
            <Text style={styles.badgePickingText}>ALISTAMIENTO</Text>
          </View>
        </View>

        <View style={styles.orderMetaCard}>
          <View style={styles.metaRow}>
            <Ionicons color="#38BDF8" name="location-outline" size={16} />
            <Text numberOfLines={1} style={styles.metaText}>
              Destino: {selectedOrder.destination}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons color="#10B981" name="car-outline" size={16} />
            <Text style={styles.metaText}>
              Conductor: {selectedOrder.driver_name} · {selectedOrder.vehicle}
            </Text>
          </View>
          <View style={styles.zeroScanNotice}>
            <Ionicons color="#34D399" name="flash" size={14} />
            <Text style={styles.zeroScanNoticeText}>
              Cero escáneres: Carga las cajas físicas y marca [ ✔️ Listo ] por línea.
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              Progreso del pedido: {readyItemsCount} de {totalItems} ítems ({progressPercent}%)
            </Text>
            {allItemsReady ? (
              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>TODO CARGADO</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: allItemsReady ? '#10B981' : '#38BDF8' },
              ]}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.checklistScroll} showsVerticalScrollIndicator={false}>
          {selectedOrder.items.map((item: ApprovedPickingItem) => {
            const isReady = !!itemStatuses[item.id];

            return (
              <View
                key={item.id}
                style={[styles.checklistItemCard, isReady && styles.checklistItemReady]}
              >
                <View style={styles.itemInfoCol}>
                  <View style={styles.locationBadgeRow}>
                    <Ionicons color="#38BDF8" name="navigate" size={12} />
                    <Text style={styles.locationBadgeText}>{item.location}</Text>
                  </View>

                  <Text style={[styles.itemProductName, isReady && styles.itemProductNameReady]}>
                    {item.product_name}
                  </Text>

                  <View style={styles.itemSkuQtyRow}>
                    <Text style={styles.itemSkuText}>SKU: {item.sku}</Text>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeLabel}>Recoger:</Text>
                      <Text style={styles.qtyBadgeAmount}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => handleToggleItemReady(item.id)}
                  style={({ pressed }) => [
                    styles.readyBtn,
                    isReady && styles.readyBtnChecked,
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <Ionicons
                    color={isReady ? '#04150F' : '#38BDF8'}
                    name={isReady ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={22}
                  />
                  <Text style={[styles.readyBtnText, isReady && styles.readyBtnTextChecked]}>
                    {isReady ? 'Listo' : '✔️ Listo'}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <Pressable
            disabled={completing}
            onPress={handleCompleteOrder}
            style={({ pressed }) => [
              styles.completeBtn,
              !allItemsReady && styles.completeBtnDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Ionicons color="#04150F" name="cube" size={22} />
            <Text style={styles.completeBtnText}>
              {completing
                ? 'Descontando inventario...'
                : 'Finalizar Pedido y Descontar Inventario'}
            </Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons color="#FFFFFF" name="arrow-back" size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>📦 Alistamiento de Pedidos</Text>
          <Text style={styles.headerSub}>Despacho sin escáner · Checklist por Cliente</Text>
        </View>
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>{orders.length} Pedidos</Text>
        </View>
      </View>

      <View style={styles.introBanner}>
        <Ionicons color="#38BDF8" name="file-tray-stacked" size={24} />
        <View style={{ flex: 1 }}>
          <Text style={styles.introBannerTitle}>Pedidos Asignados para Alistamiento</Text>
          <Text style={styles.introBannerSub}>
            Entra al pedido del cliente, recoge los productos en estiba y marca [ ✔️ Listo ]. El sistema descontará el inventario automáticamente.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {orders.map((order) => {
          const isCompleted = order.status === 'COMPLETED' || order.pallet_ready;
          const totalUnits = order.items.reduce((sum, it) => sum + it.quantity, 0);

          return (
            <Pressable
              key={order.id}
              disabled={isCompleted}
              onPress={() => handleSelectOrder(order)}
              style={({ pressed }) => [
                styles.orderCard,
                isCompleted && styles.orderCardCompleted,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.orderCardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCustomerLabel}>
                    Cliente: <Text style={styles.orderCustomerHighlight}>{order.customer_name}</Text>
                  </Text>
                  <Text style={styles.orderCardNumber}>Pedido: {order.order_number}</Text>
                </View>
                <View style={isCompleted ? styles.statusBadgeCompleted : styles.statusBadgePending}>
                  <Text style={isCompleted ? styles.statusBadgeCompletedText : styles.statusBadgePendingText}>
                    {isCompleted ? 'DESCONTADO' : 'POR ALISTAR'}
                  </Text>
                </View>
              </View>

              <View style={styles.orderCardMeta}>
                <View style={styles.cardMetaRow}>
                  <Ionicons color="#94A3B8" name="location-outline" size={14} />
                  <Text numberOfLines={1} style={styles.cardMetaText}>
                    {order.destination}
                  </Text>
                </View>
                <View style={styles.cardMetaRow}>
                  <Ionicons color="#10B981" name="car-outline" size={14} />
                  <Text style={styles.cardMetaText}>
                    Conductor: {order.driver_name} · {order.vehicle}
                  </Text>
                </View>
              </View>

              <View style={styles.orderCardFooter}>
                <Text style={styles.itemsSummaryText}>
                  📋 {order.items.length} productos ({totalUnits} cajas/pacas)
                </Text>

                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>
                    {isCompleted ? 'Alistado' : 'Abrir Checklist →'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  center: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  backBtn: {
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  headerCustomerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  zeroScanNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  zeroScanNoticeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  qtyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  qtyBadgeLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  qtyBadgeAmount: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '900',
  },
  orderCustomerLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  orderCustomerHighlight: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  badgeCount: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeCountText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
  },
  badgePicking: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgePickingText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '800',
  },
  introBanner: {
    backgroundColor: '#0F172A',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  introBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  introBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  scroll: {
    padding: spacing.md,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    gap: 10,
    elevation: 3,
  },
  orderCardCompleted: {
    opacity: 0.6,
    borderColor: '#059669',
  },
  orderCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderCardNumber: {
    color: '#38BDF8',
    fontSize: 17,
    fontWeight: '900',
  },
  orderCardCustomer: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  statusBadgePending: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  statusBadgePendingText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeCompleted: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgeCompletedText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  orderCardMeta: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    color: '#94A3B8',
    fontSize: 12,
    flex: 1,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemsSummaryText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  actionPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  actionPillText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  orderMetaCard: {
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1,
  },
  progressContainer: {
    backgroundColor: '#111827',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  readyBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  readyBadgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  checklistScroll: {
    padding: spacing.md,
    gap: 12,
  },
  checklistItemCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistItemReady: {
    borderColor: '#059669',
    backgroundColor: '#022C22',
  },
  itemInfoCol: {
    flex: 1,
    gap: 4,
  },
  locationBadgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  locationBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  itemProductName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  itemProductNameReady: {
    color: '#A7F3D0',
  },
  itemSkuQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  itemSkuText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  itemQtyBig: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
  },
  readyBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 2,
  },
  readyBtnChecked: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  readyBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '900',
  },
  readyBtnTextChecked: {
    color: '#04150F',
  },
  completeBtn: {
    height: 56,
    backgroundColor: '#10B981',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    elevation: 4,
  },
  completeBtnDisabled: {
    opacity: 0.5,
  },
  completeBtnText: {
    color: '#04150F',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
