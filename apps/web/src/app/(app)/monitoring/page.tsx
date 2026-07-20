import { Badge, Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { hasPermission, MONITORING_CHECK_TYPE_LABELS, MONITORING_HEALTH_LABELS } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listDevices } from "@/server/devices";
import { listSites } from "@/server/sites";
import {
  getMonitoringOverview,
  listMonitoringAgents,
  listMonitoringChecks,
} from "@/server/monitoring";
import { EnrollmentTokenForm } from "@/components/monitoring/enrollment-token-form";
import { MonitoringCheckForm } from "@/components/monitoring/check-form";
import { DeleteCheckButton, RevokeAgentButton } from "@/components/monitoring/monitoring-actions";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const session = await requireOrgSession("monitoring:read");
  const canWrite = hasPermission(session.role, "monitoring:write");

  const [overview, agents, checks, devices, sites] = await Promise.all([
    getMonitoringOverview(),
    listMonitoringAgents(),
    listMonitoringChecks(),
    listDevices(),
    listSites(),
  ]);

  const deviceOptions = devices.map((d) => ({
    id: d.device.id,
    name: d.device.name,
    ipAddress: d.device.ipAddress,
  }));
  const agentOptions = agents.map((a) => ({ id: a.id, name: a.name }));
  const siteOptions = sites.map((s) => ({ id: s.site.id, name: s.site.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MultiVMS Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Lokalni agenti (outbound-only) + allowlisted preverjanja naprav.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agenti online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {overview.agentsOnline}/{overview.agentsTotal}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Online preverjanja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-emerald-600">{overview.checksOnline}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offline / napaka</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-destructive">{overview.checksOffline}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Neznano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{overview.checksUnknown}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Skupaj preverjanj</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{checks.length}</div>
          </CardContent>
        </Card>
      </div>

      {canWrite ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <EnrollmentTokenForm sites={siteOptions} />
          <MonitoringCheckForm devices={deviceOptions} agents={agentOptions} />
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Agenti ({agents.length})</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Ime</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Zadnji heartbeat</th>
                <th className="p-3 font-medium">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    Ni agentov. Ustvarite enrollment žeton in zaženite{" "}
                    <code className="text-xs">pnpm agent:dev enroll …</code>
                  </td>
                </tr>
              ) : (
                agents.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.hostname ?? a.id}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.siteName ?? "—"}</td>
                    <td className="p-3">
                      <Badge className={a.online ? "border-emerald-500/40 text-emerald-700" : undefined}>
                        {a.online ? "online" : a.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {a.lastHeartbeatAt ? new Date(a.lastHeartbeatAt).toLocaleString("sl-SI") : "—"}
                    </td>
                    <td className="p-3">
                      {canWrite && a.status !== "revoked" ? <RevokeAgentButton agentId={a.id} /> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Preverjanja ({checks.length})</h2>
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Preverjanje</th>
                <th className="p-3 font-medium">Naprava</th>
                <th className="p-3 font-medium">Tip</th>
                <th className="p-3 font-medium">Cilj</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {checks.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    Ni preverjanj. Dodajte ping/TCP/HTTP/RTSP check za napravo.
                  </td>
                </tr>
              ) : (
                checks.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.deviceName}</td>
                    <td className="p-3">
                      {MONITORING_CHECK_TYPE_LABELS[c.checkType as keyof typeof MONITORING_CHECK_TYPE_LABELS] ??
                        c.checkType}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {c.targetHost}
                      {c.targetPort ? `:${c.targetPort}` : ""}
                    </td>
                    <td className="p-3">
                      <Badge>{MONITORING_HEALTH_LABELS[c.lastStatus]}</Badge>
                      {c.lastLatencyMs != null ? (
                        <span className="ml-2 text-xs text-muted-foreground">{c.lastLatencyMs} ms</span>
                      ) : null}
                    </td>
                    <td className="p-3">{canWrite ? <DeleteCheckButton checkId={c.id} /> : null}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
