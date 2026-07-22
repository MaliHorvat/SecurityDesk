# Desktop – macOS build (stub)

> **Status:** Stub dokumentacija. macOS CI build teče z `continue-on-error`; produkcijski pipeline še ni dokončan.

## Predpogoji (cilj)

- macOS 13+ (GitHub `macos-latest` ali lokalni Mac)
- Xcode Command Line Tools
- Rust stable (`aarch64-apple-darwin` / `x86_64-apple-darwin`)
- Node.js 22, pnpm 9+

## Certifikati (potrebni za distribucijo)

| Certifikat | Apple Developer | Namen |
|------------|-----------------|--------|
| **Developer ID Application** | Da | Podpis `.app` |
| **Developer ID Installer** | Da | Podpis `.pkg` (opcijsko) |
| **Apple Notarization** | Da | Gatekeeper brez opozoril |

Postopek (Apple):

1. Apple Developer Program ($99/leto)
2. Ustvarite **Developer ID Application** certifikat v Certificates, Identifiers & Profiles
3. Izvozite `.p12` → GitHub secret (npr. `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`)
4. Notarizacija: `xcrun notarytool submit …` + `stapler staple`

Tauri env v CI (načrt):

```yaml
APPLE_SIGNING_IDENTITY: "Developer ID Application: …"
APPLE_ID: "…"
APPLE_PASSWORD: "app-specific password"
APPLE_TEAM_ID: "…"
```

## Bundle cilji

V `tauri.conf.json` dodati za macOS:

```json
"bundle": {
  "targets": ["dmg", "app"]
}
```

Build:

```bash
pnpm desktop:tauri build -- --target aarch64-apple-darwin
# ali universal – ko bo konfigurirano
```

## Naslednji koraki

- [ ] macOS ikone (`icon.icns`) – že prisotne v `src-tauri/icons/`
- [ ] CI job brez `continue-on-error` ko certifikati ready
- [ ] Upload `.dmg` v portal kot `platform: macos`

Glej [DESKTOP_RELEASES.md](./DESKTOP_RELEASES.md) in [DESKTOP_SIGNING.md](./DESKTOP_SIGNING.md).
