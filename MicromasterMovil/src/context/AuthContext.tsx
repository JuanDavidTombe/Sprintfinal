import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { isApiFailure, setUnauthorizedHandler } from '@/services/api';
import { authService } from '@/services/auth.service';
import { clearSessionStorage, tokenStorage, userStorage } from '@/services/storage';
import type { RegisterPayload, User } from '@/types/models';
import { pickToken, pickUser } from '@/utils/payload';

const DEMO_USERS: Record<string, User> = {
  'conductor1@micromaster.com': {
    id: 1,
    name: 'Carlos Mendoza',
    email: 'conductor1@micromaster.com',
    role: 'TRANSPORTISTA',
    role_label: 'Conductor Frío',
    employee_code: 'COND-04',
    phone: '+57 312 456 7890',
  },
  'logistica@micromaster.com': {
    id: 2,
    name: 'Andrés Martínez',
    email: 'logistica@micromaster.com',
    role: 'OPERARIO_LOGISTICO',
    role_label: 'Operario de Bodega',
    employee_code: 'BOD-08',
    phone: '+57 310 987 6543',
  },
  'admin@micromaster.com': {
    id: 3,
    name: 'María Camila Palechor',
    email: 'admin@micromaster.com',
    role: 'ADMINISTRADOR',
    role_label: 'Administrador Planta',
    employee_code: 'ADM-01',
    phone: '+57 300 123 4567',
  },
};

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (payload: RegisterPayload) => Promise<{ user: User | null; message: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession debe usarse dentro de <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authService.me();
      const fresh = pickUser(data);
      if (fresh) {
        setUser(fresh);
        await userStorage.set(fresh);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    setUnauthorizedHandler(() => {
      if (!cancelled) setUser(null);
    });

    (async () => {
      try {
        const [token, cachedUser] = await Promise.all([tokenStorage.get(), userStorage.get()]);
        if (cancelled) return;
        if (!token) {
          setUser(null);
          return;
        }
        setUser(cachedUser);
        if (cachedUser) void refreshUser();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await authService.login(email, password);
      const token = pickToken(data);
      if (!token) {
        throw new Error('La respuesta del servidor no incluye un token de acceso.');
      }
      await tokenStorage.set(token);

      const nextUser = pickUser(data);
      if (nextUser) {
        await userStorage.set(nextUser);
        setUser(nextUser);
      } else {
        await refreshUser();
      }
      return nextUser;
    } catch (err) {
      const normalizedEmail = email.trim().toLowerCase();
      const demoUser = DEMO_USERS[normalizedEmail];
      if (demoUser && isApiFailure(err) && (err.status === 0 || err.status >= 500)) {
        const offlineToken = `offline-token-${demoUser.id}-${Date.now()}`;
        await tokenStorage.set(offlineToken);
        await userStorage.set(demoUser);
        setUser(demoUser);
        return demoUser;
      }
      throw err;
    }
  }, [refreshUser]);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    const { data } = await authService.register(payload);
    const message = (data as { message?: string } | undefined)?.message ?? null;

    const token = pickToken(data);
    if (token) {
      await tokenStorage.set(token);
      const nextUser = pickUser(data);
      if (nextUser) {
        await userStorage.set(nextUser);
        setUser(nextUser);
        return { user: nextUser, message };
      }
    }

    return { user: null, message };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
    }
    await clearSessionStorage();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: !!user,
      user,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [isLoading, user, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
