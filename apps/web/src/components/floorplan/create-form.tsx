"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { createFloorPlanAction } from "@/server/floorplan";

type Option = { id: string; name: string; customerId?: string | null; siteId?: string | null };

export function FloorPlanCreateForm({
  customers,
  sites,
}: {
  customers: Option[];
  sites: Array<Option & { customerId: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [siteId, setSiteId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const filteredSites = useMemo(
    () => sites.filter((s) => s.customerId === customerId),
    [sites, customerId],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      if (file) {
        fd.set("file", file);
        if (file.type.startsWith("image/")) {
          const dims = await readImageDims(file);
          if (dims) {
            fd.set("originalWidth", String(dims.width));
            fd.set("originalHeight", String(dims.height));
          }
        }
      }
      const result = await createFloorPlanAction(
        {
          name,
          description,
          customerId,
          siteId,
          status: "draft",
        },
        fd,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/floorplans/${result.data!.id}/edit`);
      router.refresh();
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Nov tloris</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Ime</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer">Stranka</Label>
            <select
              id="customer"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setSiteId("");
              }}
              required
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="site">Objekt</Label>
            <select
              id="site"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              required
            >
              <option value="">Izberite objekt</option>
              {filteredSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Slika tlorisa (PNG/JPG/WEBP) ali PDF priloga</Label>
            <Input
              id="file"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending || !siteId}>
            {pending ? "Ustvarjam…" : "Ustvari tloris"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
