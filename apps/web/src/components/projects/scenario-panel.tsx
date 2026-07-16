"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { saveCctvScenario } from "@/server/projects";
import type { CctvCalculationResult } from "@securitydesk/shared/cctv-calculator";
import { CctvResultsPanel } from "@/components/projects/cctv-results";

type Scenario = {
  id: string;
  name: string;
  retentionDays: number;
  reservePercent: number;
  notes: string | null;
  result: CctvCalculationResult | null;
};

export function ScenarioPanel({
  projectId,
  scenarios,
  baseRetention,
  baseReserve,
}: {
  projectId: string;
  scenarios: Scenario[];
  baseRetention: number;
  baseReserve: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("Scenarij");
  const [retentionDays, setRetentionDays] = useState(baseRetention);
  const [reservePercent, setReservePercent] = useState(baseReserve);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(scenarios[0]?.id ?? null);

  const active = scenarios.find((s) => s.id === selected) ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Primerjava scenarijev</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Naziv</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dnevi hrambe</Label>
              <Input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rezerva %</Label>
              <Input
                type="number"
                value={reservePercent}
                onChange={(e) => setReservePercent(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await saveCctvScenario({
                      projectId,
                      name,
                      retentionDays,
                      reservePercent,
                    });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                Shrani scenarij
              </Button>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Še ni shranjenih scenarijev.</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2">Scenarij</th>
                    <th className="p-2">Dnevi</th>
                    <th className="p-2">Rezerva</th>
                    <th className="p-2">Potrebno TB</th>
                    <th className="p-2">Diski</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr
                      key={s.id}
                      className={`cursor-pointer border-t hover:bg-muted/30 ${selected === s.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelected(s.id)}
                    >
                      <td className="p-2 font-medium">{s.name}</td>
                      <td className="p-2">{s.retentionDays}</td>
                      <td className="p-2">{s.reservePercent}%</td>
                      <td className="p-2">{s.result?.totalRequiredTb ?? "—"}</td>
                      <td className="p-2">{s.result?.disksNeeded ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {active?.result ? <CctvResultsPanel result={active.result} /> : null}
    </div>
  );
}
