# Desktop – končno poročilo (Definition of Done)

Iskren status implementacije namizne aplikacije SecurityDesk na **22. 7. 2026**.

## Povzetek

| Observacija | Status |
|-------------|--------|
| Monorepo struktura `apps/desktop` + Tauri 2 | ✅ |
| Vite + React frontend build (`pnpm desktop:build`) | ✅ |
| `@securitydesk/api-client` + Bearer auth API | ✅ |
| Secure store (Rust keyring) | ✅ (implementirano) |
| DB shema `desktop_*` + updater API | ✅ |
| Admin `/settings/desktop` UI | 🟡 Delno / v teku |
| Dokumentacija (ta mapa `docs/DESKTOP_*`) | ✅ (ta commit) |
| CI `desktop-release.yml` | ✅ (ta commit) |
| Rust na lokalnem Windows dev stroju | ❌ Še ni nameščen |
| Lokalni `pnpm desktop:tauri build` (NSIS) | ❌ Zahteva Rust |
| Windows produkcijski CI build | 🟡 Pripravljen, potrebuje prvi zagon + secrets |
| macOS / Linux produkcijski build | ❌ Stub (CI continue-on-error) |
| Tauri updater pubkey / endpoint produkcija | ❌ Placeholder v `tauri.conf.json` |
| `packages/features` migracija modulov | 🟡 Placeholder paket |
| Auto-publish stable iz CI | ❌ Namerno izključeno |

## Definition of Done – checklist

### Arhitektura

- [x] Ločen `apps/desktop` brez DB odvisnosti
- [x] API route `/api/desktop/*` na Next.js
- [x] Deljeni paketi: `shared`, `api-client`, `ui`
- [x] `@securitydesk/features` placeholder za migracijo
- [ ] Vsi moduli iz web navigacije na desktopu (trenutno: dashboard, customers, sites, devices, settings)

### Varnost

- [x] Bearer tokeni, hash v bazi
- [x] Secure store namesto localStorage (produkcija)
- [x] Podpisani download linki
- [ ] Produkcijski Tauri signer ključi nastavljeni
- [x] `desktop_releases:*` dovoljenja ločena od org admin

### Build & release

- [x] NSIS konfiguracija v `tauri.conf.json`
- [x] Root skripte `desktop:*`
- [x] GitHub Actions workflow (Windows primary)
- [ ] Prvi uspešen Windows artifact na GitHubu
- [ ] Ročna objava prve stable izdaje v portalu
- [ ] macOS certifikati + notarization
- [ ] Linux AppImage/deb bundle targets

### Updater

- [x] Plugin + server endpoint implementiran
- [x] Kanali + rollout logika
- [ ] Produkcijski endpoint URL v buildu
- [ ] E2E test posodobitve (internal kanal)

### Dokumentacija

- [x] DESKTOP_ARCHITECTURE_PLAN.md
- [x] DESKTOP_ARCHITECTURE.md
- [x] DESKTOP_DEVELOPMENT.md
- [x] DESKTOP_BUILD_WINDOWS.md
- [x] DESKTOP_BUILD_MACOS.md (stub)
- [x] DESKTOP_BUILD_LINUX.md (stub)
- [x] DESKTOP_RELEASES.md
- [x] DESKTOP_UPDATER.md
- [x] DESKTOP_SIGNING.md
- [x] DESKTOP_SECURITY.md
- [x] DESKTOP_TROUBLESHOOTING.md
- [x] DESKTOP_FINAL_REPORT.md (ta datoteka)

### Okolje

- [x] `.env.example` – desktop release spremenljivke
- [ ] `packages/config` env schema – desktop release keys (opcijsko, še ni v Zod)

## Priporočeni naslednji koraki (prioriteta)

1. Namestiti Rust na dev stroku ali potrditi Windows CI build z tagom `v1.0.1`
2. Generirati Tauri signer par; nastaviti GitHub secrets
3. Zamenjati updater `pubkey` + endpoint v `tauri.conf.json`
4. Dokončati admin UI upload/publish na `/settings/desktop`
5. Migrirati prvi feature modul v `@securitydesk/features`

## Verdict

**Desktop foundation je implementiran in dokumentiran.** Produkcijska distribucija (podpisani Windows installer + stabilen updater kanal) **še ni zaključena** – blokator: Rust/CI prvi release + admin portal workflow + produkcijski signer.
