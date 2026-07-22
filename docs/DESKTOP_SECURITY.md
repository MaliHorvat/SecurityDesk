# Desktop – varnost

Varnostni model SecurityDesk namizne aplikacije: **brez lokalne baze**, **brez tokenov v localStorage**, **API samo prek HTTPS**.

## Načela

1. **Zero trust lokalno** – desktop ne zaupa datotekam uporabnika za auth
2. **Server authoritative** – vsa avtorizacija na `apps/web`
3. **Minimalna površina** – tanek Tauri shell + React UI
4. **Podpisane posodobitve** – updater brez veljavne `signature` zavrne paket

## Shranjevanje tokenov

| Način | Dovoljeno |
|-------|-----------|
| OS keychain / credential store (Tauri `secure_set`) | **Da** (produkcija) |
| In-memory Map | Samo dev / test fallback |
| `localStorage` / `sessionStorage` | **Ne** |
| Datoteke v profilu uporabnika | **Ne** za auth |

Implementacija: `apps/desktop/src/lib/secure-store.ts` → Rust `keyring` crate.

Token ključ: `securitydesk.auth.token` (opaque Bearer, ne JWT v odjemalcu).

## Avtentikacija API

- Login: `POST /api/desktop/auth/login` (email + geslo over TLS)
- Token hash v bazi (`desktop_api_token.token_hash`), ne plaintext
- TTL: `DESKTOP_API_TOKEN_TTL_DAYS` (privzeto 90)
- Logout: revokacija + brisanje iz secure store
- Ob 401: avtomatsko brisanje tokena (`onUnauthorized` v api-client)

## CSP in webview

Tauri webview naloži le bundlani `dist/` (ni remote HTML). Pri dev na `localhost:1420`:

- Ne vklapljajte `dangerousRemoteDomain` brez razloga
- Ne injectajte third-party scriptov v shell

Produkcija: brez inline eval; Vite build brez source map (razen debug build).

## Omrežje

- Samo HTTPS proti `VITE_SECURITYDESK_API_URL` v produkciji
- Certificate pinning – **ni** implementiran (načrt za visoko-varnostne stranke)
- Offline: UI banner (`offline-provider`); cached podatki minimalni

## Dovoljenja v portalu (`desktop_releases`)

Ločena od org vlog:

- `desktop_releases:read|write|upload|publish|manage`
- Privzeto samo `platform_super_admin`

Preprečuje, da org admin naloži zlonameren installer vsem tenantom.

## Prenos installerjev

- `/api/desktop/download` zahteva kratko življenjski podpisani token (`AGENT_SIGNING_SECRET` / `AUTH_SECRET`)
- SHA256 artefakta v bazi – preverjanje po uploadu (priporočeno v admin UI)

## Deep link

Scheme `securitydesk://` – validirajte poti pred navigacijo (preprečite open redirect).

## Checklist za review

- [ ] Token nikoli v localStorage
- [ ] `pubkey` v tauri.conf ujema CI signer
- [ ] Produkcijski API URL brez `localhost`
- [ ] Super admin samo za release upload
- [ ] HTTPS only v produkciji

Glej [DESKTOP_SIGNING.md](./DESKTOP_SIGNING.md) in [DESKTOP_TROUBLESHOOTING.md](./DESKTOP_TROUBLESHOOTING.md).
