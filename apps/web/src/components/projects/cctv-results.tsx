"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@securitydesk/ui";
import type { CctvCalculationResult } from "@securitydesk/shared/cctv-calculator";

export function CctvResultsPanel({ result }: { result: CctvCalculationResult }) {
  const cards = [
    { label: "Kamere", value: String(result.totalCameras) },
    { label: `Dnevno (${result.unitLabel.split("/")[0]})`, value: String(result.dailyGb) },
    { label: `Hramba ${result.unitLabel.split("/")[0]}`, value: String(result.retentionGb) },
    { label: `Z rezervo`, value: String(result.withReserveGb) },
    { label: `Potrebno ${result.unitLabel.split("/")[1]}`, value: String(result.totalRequiredTb) },
    { label: "Diski", value: String(result.disksNeeded) },
    { label: "Snemalniki", value: String(result.recordersNeeded) },
    { label: "Vhod Mbps", value: String(result.inputBandwidthMbps) },
    { label: "Izhod Mbps", value: String(result.clientBandwidthMbps) },
    { label: "PoE W", value: String(result.poeWatts) },
    { label: "UPS h", value: String(result.upsAutonomyHours) },
    { label: "Porti", value: String(result.portsNeeded) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl">{c.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {result.warnings.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="text-base">Opozorila</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Poraba po dnevih</CardTitle>
            <CardDescription>Kumulativna hramba do {result.dailySeries.length} dni</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="gb" stroke="hsl(221 83% 45%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Poraba po skupinah</CardTitle>
            <CardDescription>Dnevna količina podatkov</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.groups.map((g) => ({ name: g.name, gb: g.dailyGb }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="gb" fill="hsl(221 83% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enačbe in predpostavke</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Enačbe</p>
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {result.equations.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Predpostavke</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
