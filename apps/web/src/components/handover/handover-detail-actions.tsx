"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label, Select, Textarea } from "@securitydesk/ui";
import {
  addHandoverDocument,
  createHandoverVersion,
  signHandoverPackage,
  toggleHandoverChecklistItem,
} from "@/server/handover";
import type { HandoverDocumentInput } from "@securitydesk/shared";

type DocType = HandoverDocumentInput["docType"];

type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  checkedByName: string | null;
};

type Document = {
  id: string;
  title: string;
  docType: string;
  content: string | null;
  url: string | null;
};

type Signature = {
  id: string;
  role: "contractor" | "customer";
  signerName: string;
  signedAt: Date;
};

type Props = {
  packageId: string;
  publicToken: string | null;
  status: string;
  checklist: ChecklistItem[];
  documents: Document[];
  signatures: Signature[];
  canWrite: boolean;
  defaultSigner: string;
};

export function HandoverDetailActions({
  packageId,
  publicToken,
  status,
  checklist,
  documents,
  signatures,
  canWrite,
  defaultSigner,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("other");
  const [docContent, setDocContent] = useState("");
  const [signerName, setSignerName] = useState(defaultSigner);
  const [signerRole, setSignerRole] = useState<"contractor" | "customer">("contractor");

  const locked = status === "accepted";
  const publicUrl =
    typeof window !== "undefined" && publicToken
      ? `${window.location.origin}/h/${publicToken}`
      : publicToken
        ? `/h/${publicToken}`
        : null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kontrolni seznam</h2>
        <div className="space-y-2 rounded-xl border bg-card p-4">
          {checklist.map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={item.checked}
                disabled={!canWrite || locked || pending}
                onChange={(e) =>
                  startTransition(async () => {
                    const r = await toggleHandoverChecklistItem(item.id, e.target.checked);
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  })
                }
              />
              <span>
                <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                  {item.label}
                </span>
                {item.checkedByName ? (
                  <span className="ml-2 text-xs text-muted-foreground">({item.checkedByName})</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dokumenti</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Še ni dokumentov.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {d.title}{" "}
                  <span className="text-xs text-muted-foreground">({d.docType})</span>
                </p>
                {d.url ? (
                  <a href={d.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                    {d.url}
                  </a>
                ) : null}
                {d.content ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{d.content}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canWrite && !locked ? (
          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Naslov dokumenta</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vrsta</Label>
                <Select value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
                  <option value="manual">Navodila</option>
                  <option value="warranty">Garancija</option>
                  <option value="license">Licenca</option>
                  <option value="certificate">Certifikat</option>
                  <option value="test_result">Rezultat testa</option>
                  <option value="config">Konfiguracija</option>
                  <option value="floor_plan">Tloris</option>
                  <option value="port_plan">Načrt portov</option>
                  <option value="statement">Izjava</option>
                  <option value="other">Drugo</option>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Vsebina</Label>
                <Textarea rows={3} value={docContent} onChange={(e) => setDocContent(e.target.value)} />
              </div>
              <div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !docTitle.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await addHandoverDocument({
                        packageId,
                        title: docTitle,
                        docType,
                        content: docContent,
                        url: "",
                      });
                      if (!r.ok) setError(r.error);
                      else {
                        setDocTitle("");
                        setDocContent("");
                        router.refresh();
                      }
                    })
                  }
                >
                  Dodaj dokument
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Podpisi</h2>
        {signatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Še ni podpisov.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {signatures.map((s) => (
              <li key={s.id} className="rounded-lg border p-3">
                <span className="font-medium">
                  {s.role === "contractor" ? "Izvajalec" : "Naročnik"}: {s.signerName}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {new Date(s.signedAt).toLocaleString("sl-SI")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canWrite && !locked ? (
          <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Vloga</Label>
              <Select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value as "contractor" | "customer")}
              >
                <option value="contractor">Izvajalec</option>
                <option value="customer">Naročnik</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ime podpisnika</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={pending || !signerName.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const r = await signHandoverPackage({
                      packageId,
                      role: signerRole,
                      signerName,
                      signatureData: "",
                    });
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  })
                }
              >
                Podpiši
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {publicToken ? (
        <section className="space-y-2 rounded-xl border border-dashed p-4">
          <h2 className="text-lg font-semibold">Javna povezava za naročnika</h2>
          <p className="text-sm text-muted-foreground">
            Naročnik lahko pregleda paket in ga podpiše brez prijave.
          </p>
          <code className="block break-all rounded bg-muted px-3 py-2 text-xs">
            {publicUrl ?? `/h/${publicToken}`}
          </code>
        </section>
      ) : null}

      {canWrite && locked ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await createHandoverVersion(packageId);
              if (!r.ok) setError(r.error);
              else if (r.data) {
                router.push(`/handover/${r.data.id}`);
                router.refresh();
              }
            })
          }
        >
          Nova različica (popravek)
        </Button>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
