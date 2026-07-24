'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { api, clearTokens, getAccessToken, setTokens } from '@/lib/api-client';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    api
      .get<{ user: AuthUser }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = React.useCallback(() => {
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
