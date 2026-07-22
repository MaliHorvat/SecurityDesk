import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DesktopMeResponse } from "@securitydesk/api-client";
import { clearAuthToken, getApiClient, loadStoredAuthToken, persistAuthToken } from "@/lib/api";

export type DesktopSession = Pick<DesktopMeResponse, "user" | "organization" | "role">;

interface AuthContextValue {
  session: DesktopSession | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await loadStoredAuthToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await getApiClient().me();
        if (!cancelled) setSession({ user: me.user, organization: me.organization, role: me.role });
      } catch {
        await clearAuthToken();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await getApiClient().login({ email, password });
      await persistAuthToken(result.token);
      setSession({ user: result.user, organization: result.organization, role: result.role });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prijava ni uspela.");
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await getApiClient().logout();
    } catch {
      // Best-effort — always clear the local session even if the request fails.
    }
    await clearAuthToken();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, loading, error, login, logout }),
    [session, loading, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
