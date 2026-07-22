"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import { DESKTOP_ARCHITECTURES, DESKTOP_PLATFORMS } from "@securitydesk/shared";
import { uploadDesktopArtifact } from "@/server/desktop-releases";

export function ArtifactUploadForm({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>(DESKTOP_PLATFORMS[0]);
  const [architecture, setArchitecture] = useState<string>(DESKTOP_ARCHITECTURES[0]);
  const [packageType, setPackageType] = useState("");
  const [signature, setSignature] = useState("");
  const [sha256, setSha256] = useState("");
  const [codeSigningStatus, setCodeSigningStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Izberite namestitveno datoteko.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("platform", platform);
      fd.set("architecture", architecture);
      fd.set("packageType", packageType);
      fd.set("signature", signature);
      fd.set("sha256", sha256);
      fd.set("codeSigningStatus", codeSigningStatus);
      fd.set("file", file);

      const result = await uploadDesktopArtifact(releaseId, fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPackageType("");
      setSignature("");
      setSha256("");
      setCodeSigningStatus("");
      setFile(null);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-3 rounded-xl border p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold">Naloži namestitveno datoteko</h3>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Platforma</Label>
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {DESKTOP_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Arhitektura</Label>
          <Select value={architecture} onChange={(e) => setArchitecture(e.target.value)}>
            {DESKTOP_ARCHITECTURES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Vrsta paketa</Label>
          <Input
            required
            placeholder="npr. exe, msi, dmg, AppImage"
            value={packageType}
            onChange={(e) => setPackageType(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Status podpisovanja kode</Label>
          <Input
            placeholder="npr. signed"
            value={codeSigningStatus}
            onChange={(e) => setCodeSigningStatus(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>SHA-256 zgoščena vrednost</Label>
        <Input
          placeholder="64 šestnajstiških znakov"
          value={sha256}
          onChange={(e) => setSha256(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label>Digitalni podpis</Label>
        <Textarea rows={3} value={signature} onChange={(e) => setSignature(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="artifact-file">Namestitvena datoteka *</Label>
        <Input
          id="artifact-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Nalagam…" : "Naloži datoteko"}
        </Button>
      </div>
    </form>
  );
}
