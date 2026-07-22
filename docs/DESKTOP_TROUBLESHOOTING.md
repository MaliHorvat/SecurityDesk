# Desktop – odpravljanje težav

Pogoste napake pri razvoju, buildu in posodobitvah SecurityDesk desktop.

## Razvoj

### `pnpm desktop:tauri dev` – "Rust not found" / `cargo` missing

**Vzrok:** Rust ni nameščen (trenutno stanje na lokalnem Windows).

**Rešitev:**

```powershell
winget install Rustlang.Rustup
rustup default stable
# Zaprite in ponovno odprite terminal
pnpm desktop:tauri dev
```

Alternativa: uporabite `pnpm desktop:dev` (samo Vite) ali CI build.

### Port 1420 already in use

**Vzrok:** Prejšnji Vite proces.

**Rešitev:** Ustavite proces ali spremenite port v `vite.config.ts` (Tauri pričakuje 1420 – uskladite `tauri.conf.json` `devUrl`).

### Login ne deluje / Network Error

**Preverite:**

1. `pnpm dev` teče na `:3000`
2. `VITE_API_BASE_URL` ali `VITE_SECURITYDESK_API_URL` kaže na `http://localhost:3000`
3. `.env.local` na webu ima veljavno bazo in `AUTH_SECRET`
4. Uporabnik pripada organizaciji

### 401 na vseh API klicih

- Token potekel → ponovni login
- Token revokiran → logout na drugi napravi
- Napačen `baseUrl` (produkcijski build proti dev API)

## Build (Windows)

### NSIS build fails – linker / MSVC

```powershell
rustup toolchain install stable-x86_64-pc-windows-msvc
rustup default stable-x86_64-pc-windows-msvc
```

Namestite **Visual Studio Build Tools** z "Desktop development with C++".

### WebView2Loader.dll missing

Namestite [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### `beforeBuildCommand` failed

`pnpm build` v `apps/desktop` ne uspe (TypeScript napake). Zaženite:

```bash
pnpm desktop:typecheck
pnpm desktop:build
```

## Updater

### 204 – "ni posodobitve" vendar je izdaja objavljena

- Preverite **kanal** instalacije vs kanal izdaje
- `rolloutPercentage` – instalacija morda izven rollout bucketa
- `currentVersion` enaka ali novejša od objavljene
- Status izdaje mora biti `published`

### Signature verification failed

- `pubkey` v `tauri.conf.json` ne ujema `TAURI_SIGNING_PRIVATE_KEY` v CI
- V portal naložen napačen `signature` string
- Build brez signing secretov – ne uploadajte na produkcijski kanal

### Download 403 / expired token

- `DESKTOP_DOWNLOAD_TOKEN_TTL_MINUTES` prekratek – ponovite check
- Ura na klientu/strežniku močno skewed

### Manjka installationId

Updater klic brez `installationId` query/header. Preverite registracijo ob login (`installations/register`).

## CI (GitHub Actions)

### Windows job failed – obvezno popraviti

macOS/Linux imajo `continue-on-error`; Windows mora uspeti za release.

### macOS/Linux job failed – pričakovano (stub)

Glej [DESKTOP_BUILD_MACOS.md](./DESKTOP_BUILD_MACOS.md) in [DESKTOP_BUILD_LINUX.md](./DESKTOP_BUILD_LINUX.md).

### Secrets optional – unsigned artifacts

Brez `TAURI_SIGNING_*` build ustvari installer, updater podpis pa manjka.

## Logi

| Sloj | Kje |
|------|-----|
| Frontend | DevTools v Tauri oknu (debug) |
| Rust | Terminal ob `tauri dev` |
| API | Vercel / lokalni Next.js log |
| Update events | Tabela `desktop_update_event` |

## Podpora

Zberite: verzija app, platforma, `installationId` (Settings), čas, screenshot napake, ustrezni API status code.
