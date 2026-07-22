# Desktop – upravljanje izdaj (admin portal)

Platformni admin (`platform_super_admin`) upravlja namizne izdaje v spletnem portalu na **`/settings/desktop`**.

## Dovoljenja

| Dovoljenje | Akcija |
|------------|--------|
| `desktop_releases:read` | Pregled izdaj |
| `desktop_releases:write` | Ustvarjanje / urejanje osnutkov |
| `desktop_releases:upload` | Nalaganje installerjev |
| `desktop_releases:publish` | Objava na kanal |
| `desktop_releases:manage` | Umik, arhiv, rollout |

V navigaciji je postavka vidna le uporabnikom s `desktop_releases:read` (običajno samo super admin).

## Okolje strežnika

V `.env.local` (glej `.env.example`):

```env
DESKTOP_RELEASES_ENABLED="true"
DESKTOP_UPDATE_DEFAULT_CHANNEL="stable"
DESKTOP_UPDATE_CHECK_INTERVAL_HOURS="6"
DESKTOP_RELEASE_UPLOAD_MAX_MB="500"
```

| Spremenljivka | Privzeto | Opis |
|---------------|----------|------|
| `DESKTOP_RELEASES_ENABLED` | `true` | Skrije modul če `false` |
| `DESKTOP_UPDATE_DEFAULT_CHANNEL` | `stable` | Kanal za nove instalacije |
| `DESKTOP_UPDATE_CHECK_INTERVAL_HOURS` | `6` | Priporočeni interval preverjanja |
| `DESKTOP_RELEASE_UPLOAD_MAX_MB` | `500` | Max velikost uploada |

## Življenjski cikel izdaje

```
draft → testing → published → (paused | withdrawn | archived)
```

| Status | Pomen |
|--------|-------|
| `draft` | Priprava, brez updater dostopa |
| `testing` | Interni kanal, omejen rollout |
| `published` | Aktivno za updater (glede na kanal in rollout) |
| `paused` | Začasno ustavljeno – obstoječi ostanejo, novi check ne dobi posodobitve |
| `withdrawn` | Umaknjeno – ne ponudi se več |
| `archived` | Zgodovina, samo read |

## Kanali

| Kanal | Namen |
|-------|-------|
| `internal` | Dogfood / razvoj |
| `beta` | Zgodnji adoptatorji |
| `stable` | Splošna produkcija |

Instalacija ima `updateChannel` (registracija prek `/api/desktop/installations/register`). Updater filtrira izdaje po kanalu.

## Postopek objave (ročno)

1. **CI build** – zaženite workflow `desktop-release` (tag `v1.2.3` ali `workflow_dispatch`)
2. **Prenesite artefakt** iz GitHub Actions (npr. `SecurityDesk_1.2.3_x64-setup.exe`)
3. **Portal → Nastavitve → Desktop izdaje**
4. **Nova izdaja** – verzija (semver), kanal (`internal` najprej), naslov, release notes
5. **Upload artefakta** – platforma `windows`, arhitektura `x86_64`, paket `nsis`
   - Vnesite **Tauri signature** iz build loga
   - SHA256 datoteke (priporočeno)
6. **Status → testing** – preverite na testni instalaciji
7. **Rollout** – nastavite `rolloutPercentage` (npr. 10 → 50 → 100)
8. **Publish na stable** – šele po QA; CI **ne** objavi stable samodejno

## Rollout

`rolloutPercentage` (0–100) + deterministični hash (`isInRollout` v `@securitydesk/shared`) zagotavlja, da ista instalacija vedno dobi enak rezultat za dano izdajo.

## Shramba datotek

Artefakti se shranijo prek strežniškega `STORAGE_DRIVER` (local / S3 / vercel_blob). `downloadUrlReference` v bazi kaže na ključ ali pot; prenos gre prek podpisanega `/api/desktop/download`.

## Povezano

- [DESKTOP_UPDATER.md](./DESKTOP_UPDATER.md) – kako odjemalec preverja posodobitve
- [DESKTOP_SIGNING.md](./DESKTOP_SIGNING.md) – podpis paketov
- CI: `.github/workflows/desktop-release.yml`
