# FloorPlan Digital Twin

Modul za vizualni prikaz naprav in povezav na tlorisu objekta.

## Odločitev: React Konva

Uporabljamo `konva` + `react-konva`, ker:

- dobro deluje z React 19 / Next.js App Router (dinamični import, `ssr: false`),
- podpira pan/zoom, plasti, drag in enostavne FOV loke za kamere,
- omogoča manjši začetni paket (nalaganje samo na strani urejevalnika).

## Funkcije (Faza 1)

- Seznam tlorisov (`/floorplans`) in zavihek na objektu
- Ustvarjanje z izbiro stranke/objekta + upload PNG/JPG/WEBP (PDF kot priloga)
- Privzeti sloji (naprave, omrežje, CCTV, …)
- Način pregleda in urejanja
- Postavitev elementov, povezava na obstoječi `device`, povezave med elementi
- Približen FOV za kamere
- Undo/redo, mreža, snap, iskanje, auto-save z verzijo
- Status iz monitoring + badge za odprte servisne zahtevke
- Ustvarjanje servisnega zahtevka iz elementa
- Izvoz PNG in tisk/PDF poročila
- PortMap predlog (`switchPort`) v podrobnostih elementa

## Storage

`apps/web/src/lib/storage.ts` — `STORAGE_DRIVER=local|vercel_blob` (+ S3 pripravljeno za kasneje).

## Migracija

`packages/database/drizzle/mysql/0008_floorplan_digital_twin.sql` (vključuje tudi inventory tabele).
