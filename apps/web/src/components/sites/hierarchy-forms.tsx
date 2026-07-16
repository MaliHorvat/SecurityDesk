"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@securitydesk/ui";
import { createBuilding, createFloor, createRoom } from "@/server/sites";

export function HierarchyForms({
  siteId,
  buildings,
}: {
  siteId: string;
  buildings: Array<{
    id: string;
    name: string;
    floors: Array<{ id: string; name: string; rooms: Array<{ id: string; name: string }> }>;
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState("");
  const [floorBuildingId, setFloorBuildingId] = useState(buildings[0]?.id ?? "");
  const [floorName, setFloorName] = useState("");
  const [roomFloorId, setRoomFloorId] = useState(buildings[0]?.floors[0]?.id ?? "");
  const [roomName, setRoomName] = useState("");

  const floors = buildings.flatMap((b) => b.floors.map((f) => ({ ...f, buildingName: b.name })));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4">
        <h3 className="mb-3 font-medium">Hierarhija</h3>
        {buildings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Še ni stavb. Dodajte prvo spodaj.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {buildings.map((b) => (
              <li key={b.id}>
                <p className="font-medium">{b.name}</p>
                <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                  {b.floors.map((f) => (
                    <li key={f.id}>
                      {f.name}
                      <ul className="ml-4">
                        {f.rooms.map((r) => (
                          <li key={r.id}>· {r.name}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <form
          className="space-y-2 rounded-xl border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await createBuilding({ siteId, name: buildingName });
              if (!result.ok) setError(result.error);
              else {
                setBuildingName("");
                router.refresh();
              }
            });
          }}
        >
          <Label>Nova stavba</Label>
          <Input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} required />
          <Button type="submit" size="sm" disabled={pending}>
            Dodaj
          </Button>
        </form>

        <form
          className="space-y-2 rounded-xl border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await createFloor({ buildingId: floorBuildingId, name: floorName, level: 0 });
              if (!result.ok) setError(result.error);
              else {
                setFloorName("");
                router.refresh();
              }
            });
          }}
        >
          <Label>Novo nadstropje</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={floorBuildingId}
            onChange={(e) => setFloorBuildingId(e.target.value)}
            required
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Input value={floorName} onChange={(e) => setFloorName(e.target.value)} required placeholder="npr. P1" />
          <Button type="submit" size="sm" disabled={pending || buildings.length === 0}>
            Dodaj
          </Button>
        </form>

        <form
          className="space-y-2 rounded-xl border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await createRoom({ floorId: roomFloorId, name: roomName });
              if (!result.ok) setError(result.error);
              else {
                setRoomName("");
                router.refresh();
              }
            });
          }}
        >
          <Label>Nov prostor</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={roomFloorId}
            onChange={(e) => setRoomFloorId(e.target.value)}
            required
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.buildingName} / {f.name}
              </option>
            ))}
          </select>
          <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} required placeholder="npr. Strežniška" />
          <Button type="submit" size="sm" disabled={pending || floors.length === 0}>
            Dodaj
          </Button>
        </form>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
