# Desktop – arhitekturni načrt (trenutno stanje)

Ta dokument opisuje **trenutno** implementacijo namizne aplikacije SecurityDesk in načrt postopne migracije brez prekinitve spletne aplikacije.

## Pregled

| Sloj | Lokacija | Opis |
|------|----------|------|
| Shell (Tauri 2) | `apps/desktop/src-tauri/` | Rust: okno, secure storage, updater, deep link |
| Frontend (Vite + React) | `apps/desktop/src/` | SPA z React Router; deli UI paket `@securitydesk/ui` |
| API klient | `packages/api-client` | HTTP + Bearer tokeni proti `/api/desktop/*` |
| Backend API | `apps/web/src/app/api/desktop/` | Next.js route handlerji; dostop do baze samo na strežniku |
| Shema / domena | `packages/shared`, `packages/database` | Kanali, rollout, dovoljenja, tabele `desktop_*` |

Spletna aplikacija (`apps/web`) ostaja **vir resnice** za podatke, avtentikacijo in poslovno logiko. Namiznik je tanek odjemalec.

## Deljeni paketi

```
packages/config       — ime aplikacije, env sheme
packages/shared       — vloge, dovoljenja, navigacija, desktop sheme (Zod)
packages/api-client   — SecurityDeskApiClient (login, me, dashboard, …)
packages/ui           — Tailwind komponente (Button, Input, …)
packages/features     — (nov) placeholder za module, ki jih bodo delili web + desktop
packages/database     — samo backend (desktop nima neposrednega dostopa)
```

## API, ki ga desktop potrebuje

Implementirani endpointi (Bearer `Authorization` razen pri login):

| Metoda | Pot | Namen |
|--------|-----|-------|
| POST | `/api/desktop/auth/login` | Email/geslo → opaque token |
| POST | `/api/desktop/auth/logout` | Revokacija tokena |
| GET | `/api/desktop/me` | Seja, org, vloga |
| POST | `/api/desktop/installations/register` | Registracija `installationId` |
| GET | `/api/desktop/dashboard` | KPI za dashboard |
| GET | `/api/desktop/customers` | Seznam strank |
| GET | `/api/desktop/sites` | Seznam objektov |
| GET | `/api/desktop/devices` | Seznam naprav |
| GET | `/api/desktop/updates/{target}/{arch}/{currentVersion}` | Tauri updater manifest |
| GET | `/api/desktop/download?token=…` | Podpisan prenos artefakta |
| POST | `/api/desktop/updates/events` | Telemetrija posodobitev |

Admin portal za izdaje: **`/settings/desktop`** (dovoljenje `desktop_releases:*`, vloga `platform_super_admin`).

## Trenutno stanje frontenda

- Implementirane strani: dashboard, customers, sites, devices, settings (delno).
- Ostali moduli iz `MAIN_NAV` so v navigaciji še skriti ali označeni kot prihajajoči (`DESKTOP_NAV_IDS` v `shell.tsx`).
- Navigacija še uvozi `MAIN_NAV` neposredno iz `@securitydesk/shared`; cilj je `@securitydesk/features/shell/nav-config`.

## Tveganja

| Tveganje | Posledica | Mitigacija |
|----------|-----------|------------|
| Podvojena poslovna logika web vs desktop | Neskladje podatkov / UX | API route + `@securitydesk/api-client`; feature moduli v `packages/features` |
| Tokeni v localStorage | Kraja ob XSS | OS keychain prek Tauri `secure_*` ukazov; prepoved localStorage za auth |
| Neusklajene različice API | 401/404 v produkciji | `VITE_*` URL ob buildu; semver izdaje |
| Posodobitve brez podpisa | Supply-chain | Tauri updater + `TAURI_SIGNING_*` v CI |
| Rollout napaka | Del uporabnikov brez posodobitve | `rolloutPercentage` + `isInRollout()` v `@securitydesk/shared` |
| Windows build brez Rust lokalno | Razvijalec ne more lokalno pakirati | CI `desktop-release.yml`; lokalno `pnpm desktop:build` (samo Vite) |

## Migracija brez prekinitve spleta

1. **Ločen app** — `apps/desktop` ne spreminja `apps/web` routinga; web ostane na Vercel.
2. **Ločen auth** — desktop uporablja `desktop_api_token`, ne Better Auth cookie sej.
3. **Postopno deljenje UI** — strani se migrirajo v `packages/features/<modul>` ko stabilizirajo API.
4. **Feature flags** — moduli na desktopu se vklapljajo po `getVisibleNav(role, planId)` enako kot na webu.
5. **Brez DB v desktopu** — vse poizvedbe ostanejo v `apps/web/src/server/desktop-api.ts`.
6. **Web-first izdaje** — admin najprej objavi release v portalu, nato CI naloži artefakte (ročno povezava).

## Naslednji koraki

- [ ] Dokončati admin UI `/settings/desktop` (upload artefaktov, publish).
- [ ] Migrirati strani (projects, service, …) v `packages/features`.
- [ ] Uskladiti `VITE_SECURITYDESK_API_URL` in `VITE_API_BASE_URL` v desktop Vite config.
- [ ] Nastaviti produkcijski updater endpoint v `tauri.conf.json`.
- [ ] Windows CI build + ročna objava stable kanala.

Glej tudi [DESKTOP_ARCHITECTURE.md](./DESKTOP_ARCHITECTURE.md) (ciljna arhitektura) in [DESKTOP_FINAL_REPORT.md](./DESKTOP_FINAL_REPORT.md).
