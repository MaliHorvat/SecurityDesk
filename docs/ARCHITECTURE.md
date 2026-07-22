# Arhitektura

SecurityDesk je večnajemniški monorepo:

- **apps/web** – Next.js App Router, deploy na Vercel
- **apps/desktop** – Tauri 2 + Vite React (glej [DESKTOP_ARCHITECTURE.md](./DESKTOP_ARCHITECTURE.md))
- **apps/agent** – lokalni agent v omrežju stranke (samo odhodne TLS povezave)
- **packages/** – deljena domena, UI, baza, AI, integracije, `api-client`, `features`

## Večnajemništvo

Vsak poslovni zapis mora imeti `organizationId`. Izolacija se izvaja v:

1. podatkovnih poizvedbah
2. servisnem sloju
3. API-jih / Server Actions
4. datotekah, AI in izvozih

UI skrivanje menijev **ni** zadostna zaščita.

## Vloge

Centralni katalog: `@securitydesk/shared` (`ROLE_PERMISSIONS`).

- `platform_super_admin`
- `organization_owner`
- `organization_admin`
- `technician`
- `viewer`
- `customer_user`

## Baza

`DB_PROVIDER=mysql|postgresql` izbere Drizzle shemo. Modeli in relacije so usklajeni v obeh shemah.

## Agent

Agent ne sme izvajati poljubnih shell ukazov. Dovoljeni so samo allowlisted tipi preverjanj (Faza 7).

## Novi moduli

- **FloorPlan Digital Twin** – glej [FLOORPLAN_DIGITAL_TWIN.md](./FLOORPLAN_DIGITAL_TWIN.md) (React Konva)
- **Parts & Inventory** – glej [PARTS_AND_INVENTORY.md](./PARTS_AND_INVENTORY.md)
- **Desktop app** – glej [DESKTOP_ARCHITECTURE.md](./DESKTOP_ARCHITECTURE.md), izdaje v `/settings/desktop`
