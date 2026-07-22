# App icons

This folder intentionally ships without real icon binaries — placeholder/empty
PNG or ICO files would just confuse `tauri build`. Generate the actual set
from a single source image (ideally a 1024×1024 PNG with transparency) with:

```sh
pnpm desktop:icons
```

That runs `tauri icon` against `apps/desktop/src-tauri/app-icon.png` (add your
source artwork there first) and writes the platform-specific icons this
folder needs, matching what `tauri.conf.json` → `bundle.icon` expects:

- `32x32.png`
- `128x128.png`
- `[email protected]`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Requires the Rust toolchain + Tauri CLI (already a devDependency of
`@securitydesk/desktop`) to be installed locally — it is not run in CI.
