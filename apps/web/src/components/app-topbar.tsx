"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@securitydesk/ui";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppTopbar({
  userName,
  orgName,
  logoutLabel,
}: {
  userName: string;
  orgName?: string | null;
  logoutLabel: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card/70 px-4 backdrop-blur md:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{userName}</p>
        {orgName ? <p className="truncate text-xs text-muted-foreground">{orgName}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {logoutLabel}
        </Button>
      </div>
    </header>
  );
}
