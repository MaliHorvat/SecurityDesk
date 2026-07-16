"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@securitydesk/ui";
import type { ServiceReportInput } from "@securitydesk/shared";
import {
  createReportVersionFromFinal,
  createServiceReport,
  finalizeServiceReport,
} from "@/server/service";

type Report = {
  id: string;
  title: string;
  status: "draft" | "final";
  version: number;
  faultDescription: string | null;
  workPerformed: string | null;
  findings: string | null;
  recommendations: string | null;
  customerSummary: string | null;
  technicianName: string | null;
  materials: ServiceReportInput["materials"];
  photos: ServiceReportInput["photos"];
  finalizedAt: Date | null;
};

type Props = {
  ticketId: string;
  ticketTitle: string;
  ticketDescription: string | null;
  workOrderId?: string;
  workDone?: string | null;
  findings?: string | null;
  recommendations?: string | null;
  materials?: ServiceReportInput["materials"];
  reports: Report[];
  orgName: string;
  customerName: string | null;
  siteName: string | null;
  technicianDefault: string;
  canWrite: boolean;
};

export function ServiceReportPanel({
  ticketId,
  ticketTitle,
  ticketDescription,
  workOrderId,
  workDone,
  findings,
  recommendations,
  materials,
  reports,
  orgName,
  customerName,
  siteName,
  technicianDefault,
  canWrite,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: `Servisni zapisnik – ${ticketTitle}`,
    faultDescription: ticketDescription ?? "",
    workPerformed: workDone ?? "",
    findings: findings ?? "",
    recommendations: recommendations ?? "",
    customerSummary: "",
    technicianName: technicianDefault,
  });

  function createFromWorkOrder() {
    setForm({
      title: `Servisni zapisnik – ${ticketTitle}`,
      faultDescription: ticketDescription ?? "",
      workPerformed: workDone ?? "",
      findings: findings ?? "",
      recommendations: recommendations ?? "",
      customerSummary: "",
      technicianName: technicianDefault,
    });
    setShowForm(true);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createServiceReport({
        ticketId,
        workOrderId: workOrderId ?? "",
        title: form.title,
        faultDescription: form.faultDescription,
        workPerformed: form.workPerformed,
        findings: form.findings,
        recommendations: form.recommendations,
        customerSummary: form.customerSummary,
        materials: materials ?? [],
        photos: [],
        technicianName: form.technicianName,
        status: "draft",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      router.refresh();
    });
  }

  async function exportPdf(report: Report) {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(orgName, 14, 18);
    doc.setFontSize(12);
    doc.text(report.title, 14, 28);
    doc.setFontSize(10);
    const lines = [
      `Stranka: ${customerName ?? "—"}`,
      `Objekt: ${siteName ?? "—"}`,
      `Tehnik: ${report.technicianName ?? "—"}`,
      `Status: ${report.status === "final" ? "Potrjen" : "Osnutek"} (v${report.version})`,
      "",
      "Opis napake:",
      report.faultDescription || "—",
      "",
      "Izvedena dela:",
      report.workPerformed || "—",
      "",
      "Ugotovitve:",
      report.findings || "—",
      "",
      "Priporočila:",
      report.recommendations || "—",
      "",
      "Povzetek za stranko:",
      report.customerSummary || "—",
    ];
    let y = 38;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, 180);
      doc.text(wrapped, 14, y);
      y += wrapped.length * 5 + 2;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
    if (report.materials.length) {
      // @ts-expect-error autotable
      doc.autoTable({
        startY: y + 4,
        head: [["Material", "Količina", "Enota"]],
        body: report.materials.map((m) => [m.name, String(m.quantity), m.unit]),
      });
    }
    doc.save(`${report.title.replace(/\s+/g, "_")}.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Servisni zapisniki</h2>
        {canWrite ? (
          <Button type="button" size="sm" onClick={createFromWorkOrder}>
            Nov zapisnik
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nov zapisnik (osnutek)</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreate}>
              <div className="space-y-2">
                <Label>Naslov</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Opis napake</Label>
                <Textarea
                  rows={2}
                  value={form.faultDescription}
                  onChange={(e) => setForm({ ...form, faultDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Izvedena dela</Label>
                <Textarea
                  rows={2}
                  value={form.workPerformed}
                  onChange={(e) => setForm({ ...form, workPerformed: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ugotovitve</Label>
                <Textarea
                  rows={2}
                  value={form.findings}
                  onChange={(e) => setForm({ ...form, findings: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priporočila</Label>
                <Textarea
                  rows={2}
                  value={form.recommendations}
                  onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Povzetek za stranko</Label>
                <Textarea
                  rows={2}
                  value={form.customerSummary}
                  onChange={(e) => setForm({ ...form, customerSummary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tehnik</Label>
                <Input
                  value={form.technicianName}
                  onChange={(e) => setForm({ ...form, technicianName: e.target.value })}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "…" : "Shrani osnutek"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Prekliči
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">Še ni zapisnikov.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {report.title}{" "}
                      <span className="text-muted-foreground">v{report.version}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.status === "final" ? "Potrjen" : "Osnutek"} · {report.technicianName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => exportPdf(report)}>
                      PDF
                    </Button>
                    {canWrite && report.status === "draft" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await finalizeServiceReport(report.id);
                            if (!r.ok) setError(r.error);
                            else router.refresh();
                          })
                        }
                      >
                        Potrdi
                      </Button>
                    ) : null}
                    {canWrite && report.status === "final" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await createReportVersionFromFinal(report.id);
                            if (!r.ok) setError(r.error);
                            else router.refresh();
                          })
                        }
                      >
                        Nova različica
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {report.workPerformed || report.faultDescription || "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
