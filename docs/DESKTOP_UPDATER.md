# Desktop – Tauri updater

SecurityDesk uporablja **tauri-plugin-updater** z manifestom, ki ga servira portal (`apps/web`).

## Konfiguracija v aplikaciji

`apps/desktop/src-tauri/tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "active": true,
    "dialog": true,
    "endpoints": [
      "https://portal.example.com/api/desktop/updates/{{target}}/{{arch}}/{{current_version}}"
    ],
    "pubkey": "<TAURI_SIGNER_PUBLIC_KEY>"
  }
}
```

Placeholder `https://placeholder/...` zamenjajte z `APP_URL` produkcijskega portala pred release buildom.

## Endpoint format

```
GET /api/desktop/updates/{target}/{arch}/{currentVersion}
```

| Parameter | Vrednosti |
|-----------|-----------|
| `target` | `windows`, `macos`, `linux` |
| `arch` | `x86_64`, `aarch64` |
| `currentVersion` | npr. `1.0.0` |

### Query / headers

| Ime | Obvezno | Opis |
|-----|---------|------|
| `installationId` | Da | Query ali header `X-SecurityDesk-Installation-Id` |
| `channel` | Ne | Query ali `X-SecurityDesk-Channel` (`internal` \| `beta` \| `stable`) |

### Odgovori

**204 No Content** – ni novejše izdaje (ali rollout izključuje to instalacijo).

**200 JSON** (Tauri format):

```json
{
  "version": "1.1.0",
  "pub_date": "2026-07-22T12:00:00.000Z",
  "url": "https://portal.example.com/api/desktop/download?token=…",
  "signature": "<minisign signature>",
  "notes": "Release notes (markdown/plain)"
}
```

`url` vodi na **podpisan** prenos (`DESKTOP_DOWNLOAD_TOKEN_TTL_MINUTES`, privzeto 10 min).

## Kanali

| Kanal | Uporaba |
|-------|---------|
| `internal` | CI / interni testerji |
| `beta` | Zgodnji uporabniki |
| `stable` | Produkcija |

Privzeti kanal na strežniku: `DESKTOP_UPDATE_DEFAULT_CHANNEL`.

Instalacija registrira kanal ob prvem zagonu (`POST /api/desktop/installations/register`).

## Rollout

Admin nastavi `rolloutPercentage` na izdaji. Strežnik uporabi `findDesktopUpdate()` + `isInRollout(releaseId, installationId, percent)`.

Primer: 25 % – priblino četrtina instalacij dobi posodobitev, ostali 204.

## Obvezne posodobitve

Polje `isMandatory` na izdaji + `minimumSupportedVersion` – odjemalec lahko prikaže trd dialog (implementacija v frontendu / plugin config).

## Telemetrija

Desktop pošlje dogodke na `POST /api/desktop/updates/events`:

- `check`, `download`, `install`, `error`

Uporabno za podporo in monitoring uspešnosti rollouta.

## Interval preverjanja

Priporočilo: `DESKTOP_UPDATE_CHECK_INTERVAL_HOURS=6`. Dejansko sprožanje v Rust/JS sloju (ob zagonu + periodično).

## CI in kanali

- GitHub Actions **ne** objavi avtomatsko na `stable`
- Artefakti iz CI → ročno upload v portal → publish po kanalu

Glej [DESKTOP_RELEASES.md](./DESKTOP_RELEASES.md) in [DESKTOP_SIGNING.md](./DESKTOP_SIGNING.md).
