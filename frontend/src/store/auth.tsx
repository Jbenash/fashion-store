import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api';
import type { User } from '../lib/types';

const USER_KEY = 'atelier.user';

interface AuthApi {
  user: User | null;
  isAdmin: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthApi | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Trust the stored session on boot; the API clears it on the first 401.
  useEffect(() => {
    if (tokenStore.get()) setUser(readStoredUser());
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const persist = useCallback((result: { token: string; user: User }) => {
    tokenStore.set(result.token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    } catch {
      /* ignore */
    }
    setUser(result.user);
    return result.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) =>
      persist(await api.login({ email, password })),
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) =>
      persist(await api.register({ name, email, password })),
    [persist],
  );

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === 'ADMIN',
      ready,
      login,
      register,
      logout,
    }),
    [user, ready, login, register, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
