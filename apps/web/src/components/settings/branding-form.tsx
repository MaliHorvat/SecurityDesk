"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label } from "@securitydesk/ui";
import { useRouter } from "next/navigation";
import { updateOrganizationBrandAction } from "@/server/organization-billing";
import type { ActionResult } from "@/server/customers";

export function BrandingForm({
  brandPrimaryColor,
  canEdit,
}: {
  brandPrimaryColor: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(brandPrimaryColor);

  function setFromInput(v: string) {
    setColor(v);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result: ActionResult = await updateOrganizationBrandAction({
        brandPrimaryColor: color,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center gap-4">
        <div
          className="h-10 w-14 rounded border"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="flex-1">
          <Label htmlFor="brandPrimaryColor">Primary brand color</Label>
          <Input
            id="brandPrimaryColor"
            type="color"
            value={color}
            disabled={!canEdit || pending}
            onChange={(e) => setFromInput(e.target.value)}
            className="h-10 px-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">{color}</p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canEdit || pending}>
          {pending ? "Shranjujem…" : "Shrani"}
        </Button>
      </div>
    </form>
  );
}

