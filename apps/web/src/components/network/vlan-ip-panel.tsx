"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select } from "@securitydesk/ui";
import {
  createNetworkIp,
  createNetworkVlan,
  deleteNetworkIp,
  deleteNetworkVlan,
} from "@/server/network";

type Vlan = {
  id: string;
  vlanId: number;
  name: string;
  subnetCidr: string | null;
  gateway: string | null;
};

type IpRow = {
  assignment: {
    id: string;
    ipAddress: string;
    hostname: string | null;
    vlanId: number | null;
    macAddress: string | null;
  };
  deviceName: string | null;
  siteName: string | null;
};

type SiteOption = { id: string; name: string };

export function VlanIpPanel({
  vlans,
  ips,
  sites,
  canWrite,
}: {
  vlans: Vlan[];
  ips: IpRow[];
  sites: SiteOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [vlanForm, setVlanForm] = useState({
    vlanId: 100,
    name: "",
    siteId: "",
    subnetCidr: "",
    gateway: "",
  });
  const [ipForm, setIpForm] = useState({
    ipAddress: "",
    hostname: "",
    siteId: "",
    vlanId: "",
    macAddress: "",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">VLAN-i</h2>
        {vlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Še ni VLAN-ov.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {vlans.map((v) => (
              <li key={v.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>
                  <span className="font-medium">VLAN {v.vlanId}</span> · {v.name}
                  {v.subnetCidr ? (
                    <span className="ml-2 text-muted-foreground">{v.subnetCidr}</span>
                  ) : null}
                </span>
                {canWrite ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteNetworkVlan(v.id);
                        router.refresh();
                      })
                    }
                  >
                    Izbriši
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canWrite ? (
          <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>VLAN ID</Label>
              <Input
                type="number"
                value={vlanForm.vlanId}
                onChange={(e) => setVlanForm({ ...vlanForm, vlanId: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Ime</Label>
              <Input
                value={vlanForm.name}
                onChange={(e) => setVlanForm({ ...vlanForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Subnet</Label>
              <Input
                placeholder="192.168.10.0/24"
                value={vlanForm.subnetCidr}
                onChange={(e) => setVlanForm({ ...vlanForm, subnetCidr: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Gateway</Label>
              <Input
                value={vlanForm.gateway}
                onChange={(e) => setVlanForm({ ...vlanForm, gateway: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                size="sm"
                disabled={pending || !vlanForm.name.trim()}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const r = await createNetworkVlan(vlanForm);
                    if (!r.ok) setError(r.error);
                    else {
                      setVlanForm({ ...vlanForm, name: "", subnetCidr: "", gateway: "" });
                      router.refresh();
                    }
                  })
                }
              >
                Dodaj VLAN
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">IP naslovi</h2>
        {ips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Še ni IP zapisov.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {ips.map(({ assignment, deviceName, siteName }) => (
              <li
                key={assignment.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span>
                  <span className="font-medium">{assignment.ipAddress}</span>
                  {assignment.hostname ? ` · ${assignment.hostname}` : ""}
                  {deviceName ? ` · ${deviceName}` : ""}
                  {siteName ? (
                    <span className="ml-2 text-muted-foreground">{siteName}</span>
                  ) : null}
                </span>
                {canWrite ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteNetworkIp(assignment.id);
                        router.refresh();
                      })
                    }
                  >
                    Izbriši
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canWrite ? (
          <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>IP *</Label>
              <Input
                value={ipForm.ipAddress}
                onChange={(e) => setIpForm({ ...ipForm, ipAddress: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Hostname</Label>
              <Input
                value={ipForm.hostname}
                onChange={(e) => setIpForm({ ...ipForm, hostname: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Objekt</Label>
              <Select
                value={ipForm.siteId}
                onChange={(e) => setIpForm({ ...ipForm, siteId: e.target.value })}
              >
                <option value="">—</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>VLAN ID</Label>
              <Input
                value={ipForm.vlanId}
                onChange={(e) => setIpForm({ ...ipForm, vlanId: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                size="sm"
                disabled={pending || !ipForm.ipAddress.trim()}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const r = await createNetworkIp({
                      ipAddress: ipForm.ipAddress,
                      hostname: ipForm.hostname,
                      siteId: ipForm.siteId,
                      vlanId: ipForm.vlanId ? Number(ipForm.vlanId) : null,
                      macAddress: ipForm.macAddress,
                      deviceId: "",
                      notes: "",
                    });
                    if (!r.ok) setError(r.error);
                    else {
                      setIpForm({ ...ipForm, ipAddress: "", hostname: "" });
                      router.refresh();
                    }
                  })
                }
              >
                Dodaj IP
              </Button>
            </div>
          </div>
        ) : null}
      </section>
      {error ? <p className="text-sm text-destructive lg:col-span-2">{error}</p> : null}
    </div>
  );
}
