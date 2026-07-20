"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@securitydesk/ui";
import { authClient } from "@/lib/auth-client";
import { formatAuthError } from "@/lib/auth-errors";
import type { Dictionary } from "@/lib/i18n";

export function RegisterForm({ labels, appName }: { labels: Dictionary["auth"]; appName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(formatAuthError(result.error, "Registracija ni uspela."));
        return;
      }

      // Ensure session cookie is established (some setups don't auto-sign-in reliably).
      const signedIn = await authClient.signIn.email({ email, password });
      if (signedIn.error) {
        setError(
          formatAuthError(
            signedIn.error,
            "Račun je ustvarjen, prijava pa ni uspela. Prijavite se ročno, nato ustvarite organizacijo.",
          ),
        );
        router.push("/login?next=/onboarding");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Registracija ni uspela. Preverite, ali teče `pnpm dev`.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-none shadow-lg">
      <CardHeader>
        <CardTitle>{appName}</CardTitle>
        <CardDescription>{labels.register}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">{labels.name}</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{labels.email}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{labels.password}</Label>
            <Input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "…" : labels.createAccount}
          </Button>
          <p className="text-sm text-muted-foreground">
            {labels.hasAccount}{" "}
            <Link href="/login" className="font-medium text-primary">
              {labels.signIn}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
