"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
} from "@securitydesk/ui";
import type { FloorPlanElementType } from "@securitydesk/shared";
import { saveFloorPlanCanvasAction, createTicketFromFloorPlanElementAction } from "@/server/floorplan";

const StageCanvas = dynamic(() => import("./floorplan-stage"), { ssr: false });
type StageHandle = { exportPng: () => string | null };

export type EditorElement = {
  id: string;
  layerId: string;
  elementType: FloorPlanElementType;
  deviceId?: string | null;
  label?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  isLocked?: boolean;
  statusOverride?: string | null;
  metadata?: Record<string, unknown> | null;
  device?: {
    id: string;
    name: string;
    ipAddress?: string | null;
    serialNumber?: string | null;
    status?: string | null;
  } | null;
  openTickets?: Array<{ id: string; title: string; status: string }>;
};

export type EditorLayer = {
  id: string;
  name: string;
  type: string;
  isVisible: boolean;
  isLocked: boolean;
  sortOrder: number;
};

export type EditorConnection = {
  id: string;
  sourceElementId: string;
  targetElementId: string;
  connectionType: string;
  label?: string | null;
};

export type EditorZone = {
  id: string;
  name: string;
  zoneType: string;
  points: Array<{ x: number; y: number }>;
  opacity: number;
};

const PALETTE: Array<{ type: FloorPlanElementType; label: string }> = [
  { type: "camera", label: "Kamera" },
  { type: "nvr", label: "Snemalnik" },
  { type: "switch", label: "Stikalo" },
  { type: "router", label: "Usmerjevalnik" },
  { type: "wifi_ap", label: "Wi-Fi AP" },
  { type: "intercom", label: "Domofon" },
  { type: "alarm_panel", label: "Alarmna centrala" },
  { type: "fire_detector", label: "Požarni javljalnik" },
  { type: "card_reader", label: "Čitalnik" },
  { type: "note", label: "Opomba" },
];

function statusColor(status?: string | null) {
  switch ((status || "unknown").toLowerCase()) {
    case "online":
    case "ok":
    case "active":
      return "#16a34a";
    case "warning":
    case "degraded":
      return "#ca8a04";
    case "offline":
    case "down":
    case "decommissioned":
    case "inactive":
      return "#dc2626";
    case "maintenance":
      return "#2563eb";
    default:
      return "#64748b";
  }
}

export function FloorPlanEditor({
  mode,
  floorPlanId,
  planName,
  version,
  imageUrl,
  width,
  height,
  layers: initialLayers,
  elements: initialElements,
  connections: initialConnections,
  zones: initialZones,
  devices,
  canEdit,
  canExport = false,
  canCreateTicket = false,
}: {
  mode: "view" | "edit";
  floorPlanId: string;
  planName: string;
  version: number;
  imageUrl: string | null;
  width: number;
  height: number;
  layers: EditorLayer[];
  elements: EditorElement[];
  connections: EditorConnection[];
  zones: EditorZone[];
  devices: Array<{
    id: string;
    name: string;
    siteId: string | null;
    ipAddress?: string | null;
    switchPort?: string | null;
  }>;
  canEdit: boolean;
  canExport?: boolean;
  canCreateTicket?: boolean;
}) {
  const [layers, setLayers] = useState(initialLayers);
  const [elements, setElements] = useState(initialElements);
  const [connections, setConnections] = useState(initialConnections);
  const [zones] = useState(initialZones);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [expectedVersion, setExpectedVersion] = useState(version);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const stageRef = useRef<StageHandle | null>(null);
  const [history, setHistory] = useState<EditorElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef({ history: [initialElements], index: 0 });

  const editable = mode === "edit" && canEdit;
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.isVisible).map((l) => l.id)),
    [layers],
  );

  const pushHistory = useCallback((next: EditorElement[]) => {
    const cur = historyRef.current;
    const sliced = cur.history.slice(0, cur.index + 1);
    sliced.push(next);
    if (sliced.length > 40) sliced.shift();
    historyRef.current = { history: sliced, index: sliced.length - 1 };
    setHistory(sliced);
    setHistoryIndex(sliced.length - 1);
  }, []);

  const updateElements = useCallback(
    (updater: (prev: EditorElement[]) => EditorElement[]) => {
      setElements((prev) => {
        const next = updater(prev);
        pushHistory(next);
        setDirty(true);
        return next;
      });
    },
    [pushHistory],
  );

  function undo() {
    const cur = historyRef.current;
    if (cur.index <= 0) return;
    const index = cur.index - 1;
    historyRef.current = { ...cur, index };
    setHistoryIndex(index);
    setElements(cur.history[index]!);
    setDirty(true);
  }

  function redo() {
    const cur = historyRef.current;
    if (cur.index >= cur.history.length - 1) return;
    const index = cur.index + 1;
    historyRef.current = { ...cur, index };
    setHistoryIndex(index);
    setElements(cur.history[index]!);
    setDirty(true);
  }

  useEffect(() => {
    if (!editable) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, editable]);

  // Autosave debounce
  useEffect(() => {
    if (!editable || !dirty) return;
    const t = setTimeout(() => {
      void save(true);
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, connections, layers, dirty, editable]);

  function addPaletteItem(type: FloorPlanElementType) {
    if (!editable) return;
    const layer =
      layers.find((l) => l.type === "devices") ||
      layers.find((l) => l.type === "cctv") ||
      layers[0];
    if (!layer) return;
    const id = crypto.randomUUID();
    updateElements((prev) => [
      ...prev,
      {
        id,
        layerId: layer.id,
        elementType: type,
        label: PALETTE.find((p) => p.type === type)?.label ?? type,
        x: 80 + prev.length * 12,
        y: 80 + prev.length * 8,
        width: 36,
        height: 36,
        rotation: type === "camera" ? 0 : 0,
        zIndex: prev.length,
        metadata:
          type === "camera"
            ? { directionDeg: 0, fovDeg: 90, rangePx: 120, opacity: 0.2, color: "#3b82f6" }
            : null,
      },
    ]);
    setSelectedId(id);
  }

  function bindDevice(deviceId: string) {
    if (!selected || !editable) return;
    const device = devices.find((d) => d.id === deviceId);
    updateElements((prev) =>
      prev.map((el) =>
        el.id === selected.id
          ? {
              ...el,
              deviceId,
              label: device?.name ?? el.label,
              device: device
                ? { id: device.id, name: device.name, ipAddress: device.ipAddress ?? null }
                : el.device,
            }
          : el,
      ),
    );
  }

  function save(silent = false) {
    if (!editable) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveFloorPlanCanvasAction({
        floorPlanId,
        expectedVersion,
        elements: elements.map((el) => ({
          id: el.id,
          floorPlanId,
          layerId: el.layerId,
          elementType: el.elementType,
          deviceId: el.deviceId ?? "",
          label: el.label ?? "",
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          zIndex: el.zIndex,
          metadata: el.metadata ?? undefined,
          isLocked: el.isLocked,
        })),
        connections: connections.map((c) => ({
          id: c.id,
          floorPlanId,
          sourceElementId: c.sourceElementId,
          targetElementId: c.targetElementId,
          connectionType: c.connectionType as "network",
          label: c.label ?? "",
        })),
        zones: zones.map((z) => ({
          id: z.id,
          floorPlanId,
          name: z.name,
          zoneType: z.zoneType,
          points: z.points,
          opacity: z.opacity,
        })),
        layers: layers.map((l) => ({
          id: l.id,
          isVisible: l.isVisible,
          isLocked: l.isLocked,
          sortOrder: l.sortOrder,
        })),
        changeDescription: silent ? "Samodejno shranjevanje" : "Ročno shranjevanje",
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setExpectedVersion(result.data!.version);
      setDirty(false);
      if (!silent) setMessage("Shranjeno.");
    });
  }

  function onElementMove(id: string, x: number, y: number) {
    if (!editable) return;
    const nx = snap ? Math.round(x / 10) * 10 : x;
    const ny = snap ? Math.round(y / 10) * 10 : y;
    updateElements((prev) => prev.map((el) => (el.id === id ? { ...el, x: nx, y: ny } : el)));
  }

  function deleteSelected() {
    if (!selected || !editable) return;
    updateElements((prev) => prev.filter((el) => el.id !== selected.id));
    setConnections((prev) =>
      prev.filter((c) => c.sourceElementId !== selected.id && c.targetElementId !== selected.id),
    );
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selected || !editable) return;
    const id = crypto.randomUUID();
    updateElements((prev) => [
      ...prev,
      { ...selected, id, x: selected.x + 20, y: selected.y + 20, deviceId: null, device: null },
    ]);
    setSelectedId(id);
  }

  function startConnect() {
    if (!selected) return;
    setConnectFrom(selected.id);
    setMessage("Izberite ciljni element za povezavo.");
  }

  function onSelect(id: string | null) {
    if (connectFrom && id && id !== connectFrom) {
      setConnections((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sourceElementId: connectFrom,
          targetElementId: id,
          connectionType: "network",
          label: "Omrežje",
        },
      ]);
      setDirty(true);
      setConnectFrom(null);
      setMessage("Povezava ustvarjena.");
    }
    setSelectedId(id);
  }

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return elements.filter((el) => {
      const hay = `${el.label ?? ""} ${el.device?.name ?? ""} ${el.device?.ipAddress ?? ""} ${el.device?.serialNumber ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [elements, search]);

  function focusElement(id: string) {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    setSelectedId(id);
    setStagePos({ x: width / 2 - el.x * scale, y: height / 2 - el.y * scale });
  }

  function exportPng() {
    const dataUrl = stageRef.current?.exportPng();
    if (!dataUrl) {
      setMessage("Izvoz ni uspel.");
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${planName.replace(/\s+/g, "-").toLowerCase()}-v${expectedVersion}.png`;
    a.click();
    setMessage("PNG izvožen.");
  }

  function exportPrintReport() {
    const dataUrl = stageRef.current?.exportPng();
    const win = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
    if (!win) {
      setMessage("Odpiranje poročila je blokirano.");
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${planName}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
      h1{margin:0 0 8px} img{max-width:100%;border:1px solid #cbd5e1;margin-top:16px}
      .meta{color:#64748b;font-size:14px}</style></head><body>
      <h1>${planName}</h1>
      <div class="meta">Verzija ${expectedVersion} · ${new Date().toLocaleString("sl-SI")}</div>
      <div class="meta">Elementov: ${elements.length} · Povezav: ${connections.length} · Con: ${zones.length}</div>
      ${dataUrl ? `<img src="${dataUrl}" alt="Tloris" />` : "<p>Predogled ni na voljo.</p>"}
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    win.document.close();
  }

  function createTicket() {
    if (!selected) return;
    startTransition(async () => {
      const result = await createTicketFromFloorPlanElementAction({
        floorPlanId,
        elementId: selected.id,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Servisni zahtevek ustvarjen.");
      window.location.href = `/service/${result.data!.id}`;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{planName}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "edit" ? "Način urejanja" : "Način pregleda"} · v{expectedVersion}
            {dirty ? " · neshranjene spremembe" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/floorplans/${floorPlanId}`}>
            <Button type="button" variant="outline">
              Pregled
            </Button>
          </Link>
          {canEdit ? (
            <Link href={`/floorplans/${floorPlanId}/edit`}>
              <Button type="button" variant="outline">
                Uredi
              </Button>
            </Link>
          ) : null}
          {canExport ? (
            <>
              <Button type="button" variant="outline" onClick={exportPng}>
                Izvoz PNG
              </Button>
              <Button type="button" variant="outline" onClick={exportPrintReport}>
                PDF / tisk
              </Button>
            </>
          ) : null}
          {editable ? (
            <>
              <Button type="button" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
                Razveljavi
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                Ponovi
              </Button>
              <Button type="button" onClick={() => save(false)} disabled={pending || !dirty}>
                {pending ? "Shranjujem…" : "Shrani"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[240px_1fr_300px]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Knjižnica / sloji</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editable ? (
              <div className="grid grid-cols-2 gap-2">
                {PALETTE.map((item) => (
                  <Button
                    key={item.type}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addPaletteItem(item.type)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="space-y-2">
              {layers.map((layer) => (
                <label key={layer.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layer.isVisible}
                    onChange={(e) => {
                      setLayers((prev) =>
                        prev.map((l) =>
                          l.id === layer.id ? { ...l, isVisible: e.target.checked } : l,
                        ),
                      );
                      setDirty(true);
                    }}
                  />
                  <span>{layer.name}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setScale((s) => Math.min(3, s + 0.1))}>
                +
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setScale((s) => Math.max(0.3, s - 0.1))}>
                −
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setScale(1);
                  setStagePos({ x: 0, y: 0 });
                }}
              >
                Reset
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowGrid((v) => !v)}>
                Mreža
              </Button>
              {editable ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setSnap((v) => !v)}>
                  {snap ? "Snap ON" : "Snap OFF"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="border-b p-2">
              <Input
                placeholder="Išči napravo, IP, serijsko…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searchHits.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {searchHits.slice(0, 8).map((hit) => (
                    <Button key={hit.id} type="button" size="sm" variant="secondary" onClick={() => focusElement(hit.id)}>
                      {hit.label || hit.device?.name || hit.id.slice(0, 6)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            <StageCanvas
              onReady={(handle) => {
                stageRef.current = handle;
              }}
              width={Math.min(width, 1100)}
              height={Math.min(height, 700)}
              imageUrl={imageUrl}
              scale={scale}
              stagePos={stagePos}
              onStagePosChange={setStagePos}
              showGrid={showGrid}
              elements={elements.filter((el) => visibleLayerIds.has(el.layerId))}
              connections={connections}
              zones={zones}
              selectedId={selectedId}
              editable={editable}
              onSelect={onSelect}
              onMove={onElementMove}
              statusColor={statusColor}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Podrobnosti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!selected ? (
              <p className="text-muted-foreground">Izberite element na tlorisu.</p>
            ) : (
              <>
                <div>
                  <div className="font-medium">{selected.label || selected.elementType}</div>
                  <Badge>{selected.elementType}</Badge>
                </div>
                {selected.device ? (
                  <div className="space-y-1">
                    <p>Naprava: {selected.device.name}</p>
                    <p>IP: {selected.device.ipAddress || "—"}</p>
                    <p>Status: {selected.device.status || "unknown"}</p>
                    {devices.find((d) => d.id === selected.deviceId)?.switchPort ? (
                      <p>PortMap predlog: {devices.find((d) => d.id === selected.deviceId)?.switchPort}</p>
                    ) : null}
                    <Link className="text-primary hover:underline" href={`/devices/${selected.device.id}`}>
                      Odpri napravo
                    </Link>
                  </div>
                ) : null}
                {(selected.openTickets?.length ?? 0) > 0 ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                    Odprti servisi: {selected.openTickets!.length}
                    <div className="mt-1">
                      <Link
                        className="underline"
                        href={`/service/${selected.openTickets![0]!.id}`}
                      >
                        Odpri zahtevek
                      </Link>
                    </div>
                  </div>
                ) : null}
                {canCreateTicket ? (
                  <Button type="button" size="sm" variant="outline" onClick={createTicket} disabled={pending}>
                    Ustvari servisni zahtevek
                  </Button>
                ) : null}
                {editable ? (
                  <>
                    <div className="space-y-2">
                      <Label>Poveži obstoječo napravo</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={selected.deviceId ?? ""}
                        onChange={(e) => bindDevice(e.target.value)}
                      >
                        <option value="">—</option>
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {d.ipAddress ? ` (${d.ipAddress})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selected.elementType === "camera" ? (
                      <div className="space-y-2">
                        <Label>FOV kot (°)</Label>
                        <Input
                          type="number"
                          value={Number((selected.metadata as { fovDeg?: number } | null)?.fovDeg ?? 90)}
                          onChange={(e) => {
                            const fovDeg = Number(e.target.value);
                            updateElements((prev) =>
                              prev.map((el) =>
                                el.id === selected.id
                                  ? { ...el, metadata: { ...(el.metadata ?? {}), fovDeg } }
                                  : el,
                              ),
                            );
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={startConnect}>
                        Poveži
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={duplicateSelected}>
                        Podvoji
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={deleteSelected}>
                        Izbriši
                      </Button>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
