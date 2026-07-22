import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { OfflineProvider, useOffline } from "@/providers/offline-provider";
import { Shell } from "@/components/shell";
import { LoginPage } from "@/components/login-page";
import { UpdateDialog } from "@/components/update-dialog";
import { OfflinePage } from "@/pages/offline";
import { DashboardPage } from "@/pages/dashboard";
import { CustomersPage } from "@/pages/customers";
import { SitesPage } from "@/pages/sites";
import { DevicesPage } from "@/pages/devices";
import { SettingsDesktopPage } from "@/pages/settings-desktop";
import { t } from "@/lib/i18n";

export function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <AppShell />
      </OfflineProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { isOnline } = useOffline();
  const { loading } = useAuth();

  if (!isOnline) return <OfflinePage />;
  if (loading) return <SplashScreen />;

  return (
    <>
      <AppRoutes />
      <UpdateDialog />
    </>
  );
}

function AppRoutes() {
  const { session } = useAuth();

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/" element={session ? <Shell /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="settings" element={<SettingsDesktopPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

function SplashScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
      {t.common.loading}
    </div>
  );
}
