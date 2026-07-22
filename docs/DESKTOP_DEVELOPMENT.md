# Desktop – lokalni razvoj

Navodila za zagon SecurityDesk namizne aplikacije v razvojnem načinu.

## Zahteve

| Orodje | Verzija | Opomba |
|--------|---------|--------|
| Node.js | 20+ (priporočeno 22) | Enako kot monorepo |
| pnpm | 9+ | `corepack enable` |
| Rust | stable (1.77+) | **Obvezno za `tauri dev` / `tauri build`** |
| WebView2 | najnovejši | Windows – običajno že nameščen |

> **Stanje (jul 2026):** Na lokalnem Windows razvojnem stroju Rust še ni nameščen. Vite frontend (`pnpm desktop:build`) deluje brez Rusta; polni Tauri build zahteva Rust ali GitHub Actions CI.

### Namestitev Rust (Windows)

```powershell
# Preko rustup (https://rustup.rs)
winget install Rustlang.Rustup
rustup default stable
rustc --version
```

Po namestitvi Rusta:

```powershell
pnpm install
pnpm desktop:tauri dev
```

## Hitri zagon (samo frontend v brskalniku)

```bash
pnpm install
pnpm dev              # terminal 1 – Next.js na :3000
pnpm desktop:dev      # terminal 2 – Vite na :1420
```

V brskalniku odprite `http://localhost:1420`. Auth token gre v pomnilnik (fallback), ne v keychain.

## Polni Tauri dev (native okno)

```bash
pnpm dev              # backend API mora teči
pnpm desktop:tauri dev
```

Tauri zažene `pnpm dev` (Vite) in odpre native okno z WebView2.

## API URL (build-time)

Nastavite v `apps/desktop/.env` ali `apps/desktop/.env.local`:

```env
# Preferirano ime (dokumentirano v root .env.example)
VITE_SECURITYDESK_API_URL="http://localhost:3000"

# Trenutno bere tudi aplikacija (alias – načrtovana konsolidacija)
VITE_API_BASE_URL="http://localhost:3000"

# Opcijsko – odpri modul v brskalniku
VITE_SECURITYDESK_WEB_URL="http://localhost:3000"
```

Produkcijski build:

```bash
VITE_SECURITYDESK_API_URL="https://portal.example.com" pnpm desktop:build
```

## Koristni ukazi (root `package.json`)

| Ukaz | Opis |
|------|------|
| `pnpm desktop:dev` | Samo Vite dev server (:1420) |
| `pnpm desktop:build` | `tsc` + Vite produkcijski build |
| `pnpm desktop:tauri dev` | Tauri dev okno |
| `pnpm desktop:tauri build` | Native installer (Rust + NSIS) |
| `pnpm desktop:lint` | TypeScript check |
| `pnpm desktop:test` | Vitest |
| `pnpm desktop:version 1.2.3` | Posodobi verzijo v package.json + tauri.conf |

## Struktura `apps/desktop`

```
src/              React strani, providerji, secure-store
src-tauri/        Rust, tauri.conf.json, ikone
vite.config.ts    port 1420, envPrefix VITE_
```

## Odvisnosti od backend-a

Za login in podatke mora teči `apps/web` z veljavno `.env.local` (baza, `AUTH_SECRET`, …). Glej root README in `pnpm setup`.

## Naslednji koraki

- Build navodila: [DESKTOP_BUILD_WINDOWS.md](./DESKTOP_BUILD_WINDOWS.md)
- Težave: [DESKTOP_TROUBLESHOOTING.md](./DESKTOP_TROUBLESHOOTING.md)
