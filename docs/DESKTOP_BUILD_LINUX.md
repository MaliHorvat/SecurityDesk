# Desktop – Linux build (stub)

> **Status:** Stub dokumentacija. Ubuntu CI build teče z `continue-on-error`; produkcijski pipeline še ni dokončan.

## Predpogoji (cilj)

- Ubuntu 22.04+ (GitHub `ubuntu-latest`)
- Rust stable
- Sistemne odvisnosti Tauri v2 na Linux:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  fuse libfuse2
```

## Bundle formati (cilj)

| Format | Uporaba |
|--------|---------|
| **AppImage** | Univerzalni portable paket |
| **deb** | Debian/Ubuntu namestitev |

`tauri.conf.json` (načrt):

```json
"bundle": {
  "targets": ["appimage", "deb"]
}
```

Build:

```bash
pnpm desktop:tauri build
# izhod: src-tauri/target/release/bundle/appimage/*.AppImage
#        src-tauri/target/release/bundle/deb/*.deb
```

## Podpis

- GPG podpis `.deb` repozitorija (opcijsko)
- Tauri updater `signature` – obvezno za auto-update (glej [DESKTOP_SIGNING.md](./DESKTOP_SIGNING.md))
- AppImage: SHA256 + podpis v portalu

## CI

Workflow `.github/workflows/desktop-release.yml` poskuša build na `ubuntu-latest`; artefakti se shranijo tudi ob neuspehu (macOS/Linux ne blokirajo Windows joba).

## Naslednji korodi

- [ ] Dokončati `bundle.targets` za Linux v `tauri.conf.json`
- [ ] Test AppImage na čisti Ubuntu VM
- [ ] Upload v portal (`platform: linux`, `architecture: x86_64`)
