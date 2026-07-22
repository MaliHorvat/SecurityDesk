# Desktop – Windows build (NSIS)

Navodila za produkcijski Windows installer SecurityDesk.

## Predpogoji

- Windows 10/11 (x64)
- Node.js 22, pnpm 9+
- **Rust stable** + MSVC toolchain (`rustup default stable-msvc`)
- WebView2 Runtime (na večini sistemov že prisoten)
- NSIS – vgrajen v Tauri bundler

## Lokalni build

```powershell
cd "c:\path\to\SecurityDesk_SaaS-platforme"
pnpm install

# Nastavi produkcijski API URL
$env:VITE_SECURITYDESK_API_URL = "https://portal.example.com"
$env:VITE_API_BASE_URL = "https://portal.example.com"

pnpm desktop:build
pnpm desktop:tauri build
```

Izhod (privzeto):

```
apps/desktop/src-tauri/target/release/bundle/nsis/
  SecurityDesk_1.0.0_x64-setup.exe
```

Konfiguracija bundle v `apps/desktop/src-tauri/tauri.conf.json`:

- `bundle.targets`: `["nsis"]`
- `bundle.windows.nsis.installMode`: `currentUser` (brez UAC admin)
- Jeziki installerja: English, Slovenian

## Podpis kode (code signing)

Za distribucijo zunaj interne mreže priporočeno:

| Certifikat | Namen |
|------------|--------|
| **Authenticode** (EV ali standard code signing) | Podpis `.exe` / installer – manj SmartScreen opozoril |
| **TAURI_SIGNING_*** | Podpis updater manifesta (ločen od Authenticode) |

Authenticode:

1. Nakup certifikata pri CA (npr. DigiCert, Sectigo)
2. Izvoz `.pfx` v varnem shranišču
3. V CI ali lokalno: `signtool sign /fd SHA256 /f cert.pfx /p "***" setup.exe`

Tauri updater podpis – glej [DESKTOP_SIGNING.md](./DESKTOP_SIGNING.md).

## CI build

GitHub Actions workflow `.github/workflows/desktop-release.yml`:

- Matrika `windows-latest` (obvezen uspeh)
- Artefakti se naložijo kot GitHub Actions artifacts
- **Ne** objavi avtomatsko stable v portal – admin ročno v `/settings/desktop`

## Po buildu

1. Preverite verzijo v `About` / settings desktop strani
2. Naložite `.exe` v admin portal (kanal `internal` → test → `beta` → `stable`)
3. Vnesite Tauri `signature` iz build loga ob uploadu artefakta

## Težave

Glej [DESKTOP_TROUBLESHOOTING.md](./DESKTOP_TROUBLESHOOTING.md).
