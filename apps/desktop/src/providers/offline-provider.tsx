import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getApiClient } from "@/lib/api";

interface OfflineContextValue {
  /** Browser-level connectivity (network interface up/down). */
  isOnline: boolean;
  /** Whether the SecurityDesk API was reachable on the last health check. */
  isServerReachable: boolean | null;
  checkNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

const HEALTH_CHECK_INTERVAL_MS = 30_000;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkNow = useMemo(
    () => async () => {
      if (!isOnline) {
        setIsServerReachable(false);
        return;
      }
      try {
        await getApiClient().health();
        setIsServerReachable(true);
      } catch {
        setIsServerReachable(false);
      }
    },
    [isOnline],
  );

  useEffect(() => {
    void checkNow();
    const interval = window.setInterval(() => void checkNow(), HEALTH_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [checkNow]);

  const value = useMemo<OfflineContextValue>(
    () => ({ isOnline, isServerReachable, checkNow }),
    [isOnline, isServerReachable, checkNow],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within an OfflineProvider");
  return ctx;
}
