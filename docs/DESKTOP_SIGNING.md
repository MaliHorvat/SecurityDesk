# Desktop – podpis posodobitev (Tauri signer)

Tauri updater zahteva **minisign-style** par ključev. Javni ključ je v aplikaciji; zasebni samo v CI.

## Generiranje ključev

```bash
pnpm desktop:tauri signer generate -w ~/.tauri/securitydesk.key
```

Izhod:

- **Private key** – shranite v password manager / CI secret
- **Public key** – vstavite v `tauri.conf.json` → `plugins.updater.pubkey`

Trenutno placeholder v repoju: `REPLACE_WITH_TAURI_SIGNER_PUBLIC_KEY` – **zamenjajte pred produkcijo**.

## Kje kaj shraniti

| Ključ | Lokacija | Dostop |
|-------|----------|--------|
| **Public** | `apps/desktop/src-tauri/tauri.conf.json` | V repoju (varno) |
| **Private** | GitHub Actions secrets | Nikoli v git |
| **Password** | GitHub secret | Opcijsko če je ključ zaščiten z geslom |

## GitHub Actions secrets

| Secret | Obvezen | Opis |
|--------|---------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | Priporočeno | Vsebina `.key` datoteke (base64 ali raw po Tauri docs) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Opcijsko | Geslo za encrypted private key |

Workflow `.github/workflows/desktop-release.yml` posreduje te vrednosti v `tauri build`. Brez njih build **še vedno deluje**, vendar brez updater podpisa (posodobitve ne bodo zaupane).

## Upload signature v portal

Ob nalaganju artefakta v `/settings/desktop` vnesite `signature` string iz Tauri build loga. Shranjeno v `desktop_release_artifact.signature` in vrnjeno updater API-ju.

## Ločeno od Authenticode

| Vrsta | Namen |
|-------|-------|
| **Tauri updater sign** | Integriteta update paketa (minisign) |
| **Windows Authenticode** | SmartScreen / zaupanje installerja |
| **Apple notarization** | macOS Gatekeeper |

Vse tri so neodvisne.

## Rotacija ključev

1. Generirajte nov par
2. Objavite novo app verzijo z novim `pubkey` (ali podpirajte več ključev – Tauri 2 docs)
3. Umaknite staro izdajo iz updaterja
4. Posodobite CI secrets

## Varnost

- Ne commitajte `.key` datotek (`.gitignore` v `src-tauri`)
- Omejite `desktop_releases:upload` na super admin
- Audit log objav (načrt) – trenutno `desktop_update_event` + admin akcije

Glej [DESKTOP_SECURITY.md](./DESKTOP_SECURITY.md).
