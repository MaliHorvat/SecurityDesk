import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8")) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Tauri expects a fixed port and will fail if it's not available.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Ignore the Rust project so file changes there don't trigger a reload.
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // Tauri's webview is Chromium on Windows/Linux (WebView2/WebKitGTK) and
    // WebKit on macOS — both are evergreen enough for a modern ES target.
    target: "es2021",
    outDir: "dist",
    // Don't minify for debug builds.
    minify: (process.env.TAURI_ENV_DEBUG ? false : "esbuild") as "esbuild" | false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  optimizeDeps: {
    // These are consumed as raw TypeScript source from the workspace (not a
    // pre-built dist), so let Vite pre-bundle them like any other dependency
    // instead of trying to treat the monorepo source tree as project code.
    include: ["@securitydesk/shared", "@securitydesk/ui", "@securitydesk/api-client"],
  },
}));
