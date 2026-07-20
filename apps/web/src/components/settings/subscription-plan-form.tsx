"use client";

import { useState, useTransition } from "react";
import { Button, Label, Select } from "@securitydesk/ui";
import { PLANS, type PlanId } from "@securitydesk/shared";
import { updateOrganizationPlanAction } from "@/server/organization-billing";
import type { ActionResult } from "@/server/customers";
import { useRouter } from "next/navigation";

export function SubscriptionPlanForm({
  currentPlanId,
  canEdit,
}: {
  currentPlanId: PlanId;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlanId>(currentPlanId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await updateOrganizationPlanAction({ planId: selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const plan = PLANS[selected];

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="planId">Plan</Label>
        <Select
          id="planId"
          value={selected}
          disabled={!canEdit || pending}
          onChange={(e) => setSelected(e.target.value as PlanId)}
        >
          {(Object.keys(PLANS) as PlanId[]).map((id) => (
            <option key={id} value={id}>
              {PLANS[id].name.sl}
            </option>
          ))}
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Stranke: {plan.limits.maxCustomers ?? "∞"}</p>
        <p>Naprave: {plan.limits.maxDevices ?? "∞"}</p>
        <p>Moduli: {plan.limits.modules.length}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canEdit || pending}>
          {pending ? "Upodabljam…" : "Simuliraj spremembo"}
        </Button>
      </div>
    </form>
  );
}

