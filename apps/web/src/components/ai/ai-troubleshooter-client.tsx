"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@securitydesk/ui";
import {
  SERVICE_TICKET_CATEGORIES,
  type TroubleshootingAiDraft,
  type AiTroubleshootingInput,
} from "@securitydesk/shared";
import { generateTroubleshootingDraft } from "@/server/ai-troubleshooter";

export function AiTroubleshooterClient() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TroubleshootingAiDraft | null>(null);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  const [form, setForm] = useState<AiTroubleshootingInput>({
    ticketTitle: "",
    faultDescription: "",
    workPerformed: "",
    category: "cctv",
  });

  function set<K extends keyof AiTroubleshootingInput>(key: K, value: AiTroubleshootingInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await generateTroubleshootingDraft({
        ticketTitle: form.ticketTitle,
        faultDescription: form.faultDescription,
        workPerformed: form.workPerformed,
        category: form.category,
      });

      if (!result.ok) {
        setError(result.error);
        setAiAvailable(null);
        return;
      }

      if (!result.data) {
        setError("AI odgovor je bil prazen.");
        setAiAvailable(null);
        return;
      }

      setDraft(result.data.draft);
      setAiAvailable(result.data.aiAvailable);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">AI Troubleshooter</h1>
        <p className="text-sm text-muted-foreground">Predlog diagnoze in servisnih naslednjih korakov.</p>
      </div>

      <form className="space-y-4" onSubmit={onGenerate}>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="space-y-2">
          <Label>Naslov težave *</Label>
          <Input value={form.ticketTitle} onChange={(e) => set("ticketTitle", e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>Kategorija</Label>
          <Select value={form.category ?? ""} onChange={(e) => set("category", e.target.value)}>
            {SERVICE_TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Opis napake</Label>
          <Textarea
            rows={4}
            value={form.faultDescription ?? ""}
            onChange={(e) => set("faultDescription", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Izvedena dela (opcijsko)</Label>
          <Textarea
            rows={3}
            value={form.workPerformed ?? ""}
            onChange={(e) => set("workPerformed", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Generiram..." : "Generiraj diagnozo"}
          </Button>
          {aiAvailable === false ? (
            <Badge className="bg-muted text-muted-foreground">
              AI ponudnik ni konfiguriran (uporabljene heuristike)
            </Badge>
          ) : null}
          {aiAvailable === true ? <Badge>AI vklopljen</Badge> : null}
        </div>
      </form>

      {draft ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{draft.headline}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Najverjetnejši vzroki</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {draft.likelyCauses.map((c, idx) => (
                  <li key={`${idx}-${c}`}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Naslednji koraki preverjanja</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {draft.nextChecks.map((c, idx) => (
                  <li key={`${idx}-${c}`}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Priporočena popravila</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {draft.recommendedActions.map((c, idx) => (
                  <li key={`${idx}-${c}`}>{c}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

