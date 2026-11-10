import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing } from '@/constants/theme';
import { useSession } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const normalizedName = user?.name ? user.name.replace(/Palehor/gi, 'Palechor') : 'Sin nombre';

  const initials = normalizedName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const onSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar tu turno en MicroMaster?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Turno',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Perfil Operativo</Text>

        <Card accent>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.name}>{normalizedName}</Text>
              <Text style={styles.email}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.rolePill}>
            <Ionicons color={colors.primary} name="shield-checkmark-outline" size={14} />
            <Text style={styles.roleText}>{user?.role_label ?? user?.role ?? 'Operador'}</Text>
          </View>
        </Card>

        <Card
          header={
            <Text style={styles.sectionTitle}>Credenciales de Planta & RBAC</Text>
          }
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{normalizedName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Correo Corporativo</Text>
            <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Documento (CC / NIT)</Text>
            <Text style={styles.infoValue}>{user?.identity_document ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Celular de Turno</Text>
            <Text style={styles.infoValue}>{user?.phone ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID Operador</Text>
            <Text style={styles.infoValue}>#{String(user?.id ?? '—')}</Text>
          </View>
        </Card>

        <AppButton
          icon="refresh-outline"
          loading={refreshing}
          title="Sincronizar Perfil"
          variant="secondary"
          onPress={onRefresh}
        />

        <AppButton
          icon="log-out-outline"
          loading={signingOut}
          title="Finalizar Turno / Salir"
          variant="danger"
          onPress={onSignOut}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    paddingBottom: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
  },
  rolePill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  roleText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  infoValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});
