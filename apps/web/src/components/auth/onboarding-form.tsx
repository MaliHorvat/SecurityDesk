"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { authClient } from "@/lib/auth-client";
import type { Dictionary } from "@/lib/i18n";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function OnboardingForm({ labels, appName }: { labels: Dictionary["auth"]; appName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const slug = slugify(name) || `org-${Date.now()}`;
    const result = await authClient.organization.create({
      name,
      slug,
    });
    if (result.error) {
      setLoading(false);
      setError(result.error.message || "Organizacije ni bilo mogoče ustvariti.");
      return;
    }

    if (result.data?.id) {
      await authClient.organization.setActive({ organizationId: result.data.id });
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border-none shadow-lg">
      <CardHeader>
        <CardTitle>{appName}</CardTitle>
        <CardDescription>{labels.createOrg}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="orgName">{labels.orgName}</Label>
            <Input id="orgName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="npr. Aktiva Varnost" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : labels.createOrg}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
