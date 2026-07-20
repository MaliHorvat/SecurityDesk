import { notFound } from "next/navigation";
import { hasPermission, type FloorPlanElementType } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getFloorPlanDetail } from "@/server/floorplan";
import { listDevices } from "@/server/devices";
import { FloorPlanEditor } from "@/components/floorplan/floorplan-editor";

export const dynamic = "force-dynamic";

export default async function FloorPlanViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession("floorplan:read");
  const { id } = await params;
  const detail = await getFloorPlanDetail(id);
  if (!detail) notFound();

  const devices = await listDevices();
  const siteDevices = devices
    .filter((d) => d.device.siteId === detail.plan.siteId)
    .map((d) => ({
      id: d.device.id,
      name: d.device.name,
      siteId: d.device.siteId,
      ipAddress: d.device.ipAddress,
      switchPort: d.device.switchPort,
    }));

  return (
    <FloorPlanEditor
      mode="view"
      floorPlanId={detail.plan.id}
      planName={detail.plan.name}
      version={detail.plan.version}
      imageUrl={detail.imageUrl}
      width={detail.plan.originalWidth || 1200}
      height={detail.plan.originalHeight || 800}
      layers={detail.layers}
      elements={detail.elements.map((el: (typeof detail.elements)[number]) => ({
        id: el.id,
        layerId: el.layerId,
        elementType: el.elementType as FloorPlanElementType,
        deviceId: el.deviceId,
        label: el.label,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        zIndex: el.zIndex,
        isLocked: el.isLocked,
        metadata: (el.metadata as Record<string, unknown> | null) ?? null,
        device: el.device
          ? {
              id: el.device.id,
              name: el.device.name,
              ipAddress: el.device.ipAddress,
              serialNumber: el.device.serialNumber,
              status: el.device.status,
            }
          : null,
        openTickets: el.openTickets,
      }))}
      connections={detail.connections}
      zones={detail.zones}
      devices={siteDevices}
      canEdit={hasPermission(session.role, "floorplan:write")}
      canExport={hasPermission(session.role, "floorplan:export")}
      canCreateTicket={hasPermission(session.role, "service:write")}
    />
  );
}
