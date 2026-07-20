"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@securitydesk/ui";
import { deleteMonitoringCheck, revokeMonitoringAgent } from "@/server/monitoring";

export function RevokeAgentButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Prekličem tega agenta?")) return;
        startTransition(async () => {
          await revokeMonitoringAgent(agentId);
          router.refresh();
        });
      }}
    >
      Prekliči
    </Button>
  );
}

export function DeleteCheckButton({ checkId }: { checkId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Izbrišem to preverjanje?")) return;
        startTransition(async () => {
          await deleteMonitoringCheck(checkId);
          router.refresh();
        });
      }}
    >
      Izbriši
    </Button>
  );
}
