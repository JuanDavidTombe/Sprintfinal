import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, radius, spacing } from '@/constants/theme';
import { useSession } from '@/context/AuthContext';
import {
  getActiveApiBaseUrl,
  pingBackend,
  resetCustomApiBaseUrl,
  setCustomApiBaseUrl,
} from '@/services/api';
import { getApiErrorMessage, getApiValidationErrors } from '@/utils/errors';

const QUICK_PROFILES = [
  { label: 'Conductor Frío', icon: 'bus-outline', email: 'conductor1@micromaster.com', pass: 'conductor123' },
  { label: 'Operario Bodega', icon: 'cube-outline', email: 'logistica@micromaster.com', pass: 'logistica123' },
  { label: 'Admin Planta', icon: 'shield-checkmark-outline', email: 'admin@micromaster.com', pass: 'admin123' },
] as const;

export default function LoginScreen() {
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [serverUrl, setServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverPingStatus, setServerPingStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [serverPingMessage, setServerPingMessage] = useState<string>('');

  useEffect(() => {
    let active = true;
    getActiveApiBaseUrl().then((url) => {
      if (!active) return;
      setServerUrl(url);
      setServerPingStatus('checking');
      pingBackend(url).then((res) => {
        if (!active) return;
        setServerPingStatus(res.ok ? 'ok' : 'error');
        setServerPingMessage(res.message);
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim()) return;
    setServerPingStatus('checking');
    await setCustomApiBaseUrl(serverUrl.trim());
    const res = await pingBackend(serverUrl.trim());
    setServerPingStatus(res.ok ? 'ok' : 'error');
    setServerPingMessage(res.message);
  };

  const onSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'El correo es obligatorio.';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Ingresa un correo válido.';
    if (!password) errors.password = 'La contraseña es obligatoria.';

    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setFieldErrors(getApiValidationErrors(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons color={colors.onPrimary} name="snow" size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.title}>MicroMaster</Text>
                <View style={styles.ColdBadge}>
                  <Text style={styles.ColdBadgeText}>BPM · FEFO ≤ 4°C</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>Terminal Móvil de Bodega Fría, Planta y Reparto B2B</Text>
            </View>
          </View>

          <Card>
            <Text style={styles.cardTitle}>Ingreso de Turno Operativo</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons color={colors.danger} name="alert-circle" size={18} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextField
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
              icon="mail-outline"
              keyboardType="email-address"
              label="Correo Corporativo"
              placeholder="operador@micromaster.com"
              value={email}
              onChangeText={setEmail}
            />

            <TextField
              autoCapitalize="none"
              autoComplete="password"
              error={fieldErrors.password}
              icon="lock-closed-outline"
              label="Contraseña de Turno"
              placeholder="••••••••"
              secure
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.quickRoles}>
              <Text style={styles.quickRolesLabel}>Perfiles de acceso rápido (1-Toque):</Text>
              <View style={styles.quickRolesGrid}>
                {QUICK_PROFILES.map((prof) => {
                  const selected = email === prof.email;
                  return (
                    <Pressable
                      key={prof.email}
                      style={({ pressed }) => [
                        styles.quickRoleChip,
                        selected && styles.quickRoleChipSelected,
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                      onPress={() => {
                        setEmail(prof.email);
                        setPassword(prof.pass);
                        setFieldErrors({});
                        setError(null);
                      }}
                    >
                      <Ionicons
                        color={selected ? colors.primary : colors.textMuted}
                        name={prof.icon as any}
                        size={14}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.quickRoleText, selected && { color: colors.primary }]}
                      >
                        {prof.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AppButton
              icon="log-in-outline"
              loading={loading}
              title="Iniciar Turno"
              onPress={onSubmit}
            />

            <Pressable
              style={styles.serverInfoBar}
              onPress={() => setShowServerConfig(!showServerConfig)}
            >
              <View
                style={[
                  styles.statusDot,
                  serverPingStatus === 'ok'
                    ? styles.statusDotOk
                    : serverPingStatus === 'checking'
                      ? styles.statusDotChecking
                      : styles.statusDotError,
                ]}
              />
              <Text numberOfLines={1} style={styles.serverInfoText}>
                {serverUrl || 'Detectando servidor...'}
              </Text>
              <Ionicons
                color={colors.textMuted}
                name={showServerConfig ? 'chevron-up' : 'settings-outline'}
                size={16}
              />
            </Pressable>

            {showServerConfig ? (
              <View style={styles.serverConfigBox}>
                <Text style={styles.serverConfigTitle}>Ajustar IP del Servidor Local</Text>
                
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Pressable
                    style={styles.quickPresetChip}
                    onPress={() => {
                      setServerUrl('http://10.10.34.110:8080/api');
                    }}
                  >
                    <Text style={styles.quickPresetChipText}>📶 Wi-Fi (10.10.34.110)</Text>
                  </Pressable>
                  <Pressable
                    style={styles.quickPresetChip}
                    onPress={() => {
                      setServerUrl('http://10.0.2.2:8080/api');
                    }}
                  >
                    <Text style={styles.quickPresetChipText}>📱 Emulador (10.0.2.2)</Text>
                  </Pressable>
                </View>

                <TextField
                  autoCapitalize="none"
                  label="URL de API Laravel"
                  placeholder="http://10.10.34.110:8080/api"
                  value={serverUrl}
                  onChangeText={setServerUrl}
                />
                {serverPingMessage ? (
                  <Text
                    style={[
                      styles.serverPingText,
                      serverPingStatus === 'ok' ? styles.textSuccess : styles.textDanger,
                    ]}
                  >
                    {serverPingMessage}
                  </Text>
                ) : null}
                <View style={styles.serverActionRow}>
                  <Pressable
                    style={({ pressed }) => [styles.serverActionBtn, pressed && { opacity: 0.85 }]}
                    onPress={handleSaveServerUrl}
                  >
                    <Ionicons color={colors.onPrimary} name="save-outline" size={15} />
                    <Text style={styles.serverActionBtnText}>Guardar y Probar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.serverResetBtn, pressed && { opacity: 0.85 }]}
                    onPress={async () => {
                      await resetCustomApiBaseUrl();
                      const def = await getActiveApiBaseUrl();
                      setServerUrl(def);
                      const res = await pingBackend(def);
                      setServerPingStatus(res.ok ? 'ok' : 'error');
                      setServerPingMessage(res.message);
                    }}
                  >
                    <Ionicons color={colors.textMuted} name="refresh-outline" size={15} />
                    <Text style={styles.serverResetBtnText}>Restablecer</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Nuevo operario en planta?</Text>
            <Link href="/register" style={styles.link}>
              Solicitar Alta RBAC
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: 2,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  ColdBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ColdBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  quickRoles: {
    gap: 6,
  },
  quickRolesLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  quickRolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickRoleChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
  },
  quickRoleChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  quickRoleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
  },
  serverInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOk: {
    backgroundColor: colors.primary,
  },
  statusDotChecking: {
    backgroundColor: colors.warning,
  },
  statusDotError: {
    backgroundColor: colors.danger,
  },
  serverInfoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  serverConfigBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm + 4,
    borderRadius: radius.sm,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.xs + 2,
  },
  quickPresetChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickPresetChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  serverConfigTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  serverPingText: {
    fontSize: 11,
  },
  textSuccess: {
    color: colors.primary,
  },
  textDanger: {
    color: colors.danger,
  },
  serverActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  serverActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  serverActionBtnText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  serverResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  serverResetBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
