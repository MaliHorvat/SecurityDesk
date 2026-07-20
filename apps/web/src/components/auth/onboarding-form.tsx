"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { authClient } from "@/lib/auth-client";
import { createOrganizationAction } from "@/server/organization";
import type { Dictionary } from "@/lib/i18n";

export function OnboardingForm({ labels, appName }: { labels: Dictionary["auth"]; appName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const session = await authClient.getSession();
    if (!session.data?.user) {
      setLoading(false);
      setError("Seja ni aktivna. Prijavite se znova, nato ustvarite organizacijo.");
      router.push("/login?next=/onboarding");
      return;
    }

    const result = await createOrganizationAction(name);
    if (!result.ok) {
      setLoading(false);
      if (result.code === "UNAUTHORIZED") {
        setError(result.error);
        router.push("/login?next=/onboarding");
        return;
      }
      setError(result.error);
      return;
    }

    try {
      await authClient.organization.setActive({ organizationId: result.organizationId });
    } catch {
      // Session row already has activeOrganizationId from the server action.
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
            <Input
              id="orgName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Aktiva Varnost"
            />
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
