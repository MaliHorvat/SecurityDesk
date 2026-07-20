# SecurityDesk

Modularna SaaS platforma za podjetja, ki načrtujejo, nameščajo, upravljajo in servisirajo videonadzorne, alarmne, požarne, dostopne in omrežne sisteme.

> Ime aplikacije je centralno v `@securitydesk/config` in okoljskih spremenljivkah (`APP_NAME` / `NEXT_PUBLIC_APP_NAME`).

## Funkcije (načrt po fazah)

| Modul | Status |
|-------|--------|
| Osnova (auth, org, vloge, dashboard) | **Faza 1 – aktivna** |
| SecurityDesk (stranke, objekti, naprave) | **Faza 2 – aktivna** |
| CCTV Project Designer | **Faza 3 – aktivna** |
| Servis + HandoverHub | **Faza 4 – aktivna** |
| PortMap AI | **Faza 5 – aktivna** |
| ConfigVault + FirmwareGuard | **Faza 6 – aktivna** |
| Lokalni agent + MultiVMS | **Faza 7 – aktivna** |
| CameraDeploy | **Faza 8 – aktivna** |
| AI Troubleshooter / ServiceReport AI | Faza 9 |
| Naročnine / white-label | Faza 10 |

## Zahteve

- Node.js 20+
- pnpm 9+
- MySQL/MariaDB (privzeto) ali PostgreSQL

## Namestitev

```bash
pnpm install
pnpm setup          # interaktivno ustvari .env.local in skrivnosti
pnpm db:generate
pnpm db:migrate
pnpm db:seed        # opcijsko – demo organizacija Aktiva Demo
pnpm dev
```

Odprite [http://localhost:3000](http://localhost:3000).

Če ne želite interaktivnega setupa, kopirajte `.env.example` → `.env.local` in izpolnite vrednosti ročno.

## Ukazi

| Ukaz | Opis |
|------|------|
| `pnpm dev` | Zagon spletne aplikacije |
| `pnpm build` | Produkcijski build |
| `pnpm start` | Zagon produkcijskega builda |
| `pnpm lint` | Lint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit testi |
| `pnpm db:test` | Diagnostika povezave z bazo |
| `pnpm db:migrate` | Migracije |
| `pnpm agent:dev` | Lokalni agent CLI (stub) |

## Struktura monorepo

```
apps/web          Next.js SaaS (Vercel)
apps/agent        Lokalni agent (outbound-only)
packages/config   Ime aplikacije + env sheme
packages/shared   Vloge, dovoljenja, paketi, šifriranje
packages/database Drizzle ORM (MySQL + PostgreSQL)
packages/ui       UI komponente
packages/ai       Skupni AI sloj
packages/integrations  Plugin vmesniki za proizvajalce
docs/             Dokumentacija
scripts/          setup + db:test
```

## Deployment

Glejte [docs/DEPLOYMENT_VERCEL.md](docs/DEPLOYMENT_VERCEL.md) in [docs/EXTERNAL_DATABASE.md](docs/EXTERNAL_DATABASE.md).

## Tehnološke odločitve (Faza 1)

| Odločitev | Zakaj | Alternative | Vpliv |
|-----------|-------|-------------|-------|
| **Drizzle ORM** | Dober TypeScript DX, ločene sheme MySQL/PG | Prisma, Kysely | Migracije na Vercelu ločeno od requestov |
| **Better Auth** | Next.js-prijazen, org plugin, email/password | Auth.js, Clerk | Seje v lastni bazi |
| **pnpm workspaces** | Zahtevano, hitro, lockfile | npm/yarn | Enaka namestitev v CI |
| **MySQL privzeto** | Zahteva dokumentacije | PostgreSQL pripravljen | `DB_PROVIDER` izbere shemo |

## Licenca

Lastniška koda – Vision One / Aktiva. Demonstracijski seed podatki so samo za razvoj.
