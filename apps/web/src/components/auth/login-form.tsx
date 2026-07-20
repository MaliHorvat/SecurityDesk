"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { authClient } from "@/lib/auth-client";
import { formatAuthError } from "@/lib/auth-errors";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ labels, appName }: { labels: Dictionary["auth"]; appName: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(formatAuthError(result.error, "Prijava ni uspela."));
        return;
      }
    } catch {
      setError("Prijava ni uspela. Preverite, ali teče `pnpm dev`.");
      return;
    } finally {
      setLoading(false);
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border-none shadow-lg">
      <CardHeader>
        <CardTitle>{appName}</CardTitle>
        <CardDescription>{labels.login}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">{labels.email}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{labels.password}</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : labels.signIn}
          </Button>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/forgot-password" className="hover:text-primary">
              {labels.forgotPassword}
            </Link>
            <p>
              {labels.noAccount}{" "}
              <Link href="/register" className="font-medium text-primary">
                {labels.createAccount}
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
