"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { acceptHandoverByPublicToken } from "@/server/handover";

type Props = {
  token: string;
  title: string;
  customerName: string | null;
  status: string;
  description: string | null;
  deviceSummary: string | null;
  ipTable: string | null;
  retentionNotes: string | null;
  serviceContacts: string | null;
  checklist: Array<{ id: string; label: string; checked: boolean }>;
  documents: Array<{ id: string; title: string; docType: string; content: string | null; url: string | null }>;
  signatures: Array<{ id: string; role: string; signerName: string; signedAt: Date }>;
};

export function PublicHandoverClient(props: Props) {
  const [signerName, setSignerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(props.status === "accepted");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <p className="text-sm text-muted-foreground">HandoverHub · digitalna predaja</p>
        <h1 className="text-2xl font-semibold tracking-tight">{props.title}</h1>
        <p className="text-sm text-muted-foreground">{props.customerName}</p>
      </div>

      {props.description ? (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap">{props.description}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontrolni seznam</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {props.checklist.map((item) => (
            <p key={item.id} className={item.checked ? "text-muted-foreground" : ""}>
              {item.checked ? "✓" : "○"} {item.label}
            </p>
          ))}
        </CardContent>
      </Card>

      {props.deviceSummary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Naprave</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{props.deviceSummary}</CardContent>
        </Card>
      ) : null}

      {props.ipTable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">IP tabela</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{props.ipTable}</CardContent>
        </Card>
      ) : null}

      {props.documents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dokumenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {props.documents.map((d) => (
              <div key={d.id}>
                <p className="font-medium">
                  {d.title} <span className="text-muted-foreground">({d.docType})</span>
                </p>
                {d.content ? <p className="whitespace-pre-wrap text-muted-foreground">{d.content}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {(props.retentionNotes || props.serviceContacts) && (
        <Card>
          <CardContent className="space-y-3 p-4 text-sm">
            {props.retentionNotes ? (
              <div>
                <p className="font-medium">Hramba</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{props.retentionNotes}</p>
              </div>
            ) : null}
            {props.serviceContacts ? (
              <div>
                <p className="font-medium">Servisni kontakti</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{props.serviceContacts}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podpisi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {props.signatures.map((s) => (
            <p key={s.id}>
              {s.role === "contractor" ? "Izvajalec" : "Naročnik"}: {s.signerName} (
              {new Date(s.signedAt).toLocaleString("sl-SI")})
            </p>
          ))}
          {done ? (
            <p className="font-medium text-primary">Paket je sprejet. Hvala.</p>
          ) : (
            <div className="space-y-3 border-t pt-3">
              <div className="space-y-2">
                <Label>Vaše ime (podpis naročnika)</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="button"
                disabled={pending || !signerName.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const r = await acceptHandoverByPublicToken({
                      token: props.token,
                      signerName,
                    });
                    if (!r.ok) setError(r.error);
                    else setDone(true);
                  })
                }
              >
                {pending ? "…" : "Sprejmi in podpiši predajo"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
