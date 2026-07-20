"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@securitydesk/ui";
import type { CameraDeployTargetStatus } from "@securitydesk/shared";
import {
  autoAssignTargetIps,
  deleteCameraDeployTarget,
  updateCameraDeployTargetStatus,
} from "@/server/camera-deploy";

export function AutoAssignIpsButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await autoAssignTargetIps(sessionId);
          router.refresh();
        })
      }
    >
      {pending ? "Dodeljujem…" : "Samodejno dodeli IP"}
    </Button>
  );
}

export function TargetStatusButton({
  targetId,
  status,
  label,
}: {
  targetId: string;
  status: CameraDeployTargetStatus;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await updateCameraDeployTargetStatus(targetId, status);
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}

export function DeleteTargetButton({ targetId }: { targetId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteCameraDeployTarget(targetId);
          router.refresh();
        })
      }
    >
      Odstrani
    </Button>
  );
}
