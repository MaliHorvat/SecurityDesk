# Desktop – ciljna arhitektura

Končna arhitektura SecurityDesk namizne aplikacije: **Tauri 2 + Vite + React**, komunikacija izključno prek **HTTPS API** z **Bearer tokeni**. Podatkovna baza je **samo na strežniku**.

## Diagram

```mermaid
flowchart LR
  subgraph desktop [apps/desktop]
    UI[Vite React SPA]
    Tauri[Tauri 2 Rust shell]
    Store[OS secure storage]
    UI --> Tauri
    UI --> Store
  end

  subgraph packages [Shared packages]
    AC[@securitydesk/api-client]
    FE[@securitydesk/features]
    SH[@securitydesk/shared]
    UIpkg[@securitydesk/ui]
  end

  subgraph server [apps/web]
    API["/api/desktop/*"]
    DB[(MySQL / PostgreSQL)]
    API --> DB
  end

  UI --> AC
  UI --> FE
  UI --> UIpkg
  FE --> SH
  AC -->|Bearer HTTPS| API
  Tauri -->|updater check| API
```

## Komponente

### Tauri 2 (`apps/desktop/src-tauri`)

- **Identifier:** `si.visionone.securitydesk`
- **Plugins:** updater, notification, dialog, process, deep-link, window-state, single-instance
- **Rust ukazi:** `secure_get`, `secure_set`, `get_installation_id`
- **Bundle (Windows):** NSIS, `currentUser` install mode
- **Updater:** endpoint na portalu, javni ključ v `tauri.conf.json`

### Vite frontend (`apps/desktop/src`)

- React 19 + React Router 7
- Tailwind (dark theme)
- Port dev strežnika: **1420** (zahteva Tauri)
- Build output: `apps/desktop/dist` → `frontendDist` v Tauri config

### `@securitydesk/api-client`

En sam `SecurityDeskApiClient`:

- `baseUrl` iz build-time env (`VITE_SECURITYDESK_API_URL` / `VITE_API_BASE_URL`)
- `getToken()` iz secure store
- Headers: `Authorization: Bearer …`, `X-SecurityDesk-Installation-Id`, `X-SecurityDesk-Platform`, `X-SecurityDesk-App-Version`

### Avtentikacija

1. Uporabnik vnese email/geslo → `POST /api/desktop/auth/login`
2. Strežnik ustvari zapis v `desktop_api_token` (hash v bazi, ne raw token)
3. Desktop shrani opaque token v **OS keychain** (ne localStorage)
4. Vsak API klic: `Authorization: Bearer <token>`
5. Ob 401: token se izbriše, uporabnik na login zaslon

### Posodobitve

- Tauri plugin-updater kliče `GET /api/desktop/updates/{target}/{arch}/{currentVersion}`
- Odgovor: Tauri JSON (`version`, `url`, `signature`, `pub_date`, `notes`) ali `204` če ni posodobitve
- Prenos prek podpisanega `download` tokena (TTL: `DESKTOP_DOWNLOAD_TOKEN_TTL_MINUTES`)

### Kaj desktop **ne sme**

- Ne odpira neposredne povezave na `@securitydesk/database`
- Ne shranjuje gesel (samo session token)
- Ne embeda Next.js serverja
- Ne objavlja stable izdaj samodejno iz CI (admin workflow v portalu)

## Okoljske spremenljivke

| Spremenljivka | Kje | Namen |
|---------------|-----|-------|
| `VITE_SECURITYDESK_API_URL` | desktop build | Base URL portala (API) |
| `VITE_SECURITYDESK_WEB_URL` | desktop build | Odpri v brskalniku (deep links) |
| `DESKTOP_RELEASES_ENABLED` | server `.env` | Omogoči admin modul |
| `DESKTOP_UPDATE_DEFAULT_CHANNEL` | server | Privzeti kanal (`stable`) |
| `TAURI_SIGNING_*` | CI secrets | Podpis updater paketov |

## Povezani dokumenti

- [DESKTOP_DEVELOPMENT.md](./DESKTOP_DEVELOPMENT.md)
- [DESKTOP_UPDATER.md](./DESKTOP_UPDATER.md)
- [DESKTOP_SECURITY.md](./DESKTOP_SECURITY.md)
- [DESKTOP_RELEASES.md](./DESKTOP_RELEASES.md)
