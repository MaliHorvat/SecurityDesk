import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(root, "..");
const require = createRequire(resolve(pkgDir, "package.json"));

/**
 * Invoke drizzle-kit via its JS entry (bin.cjs) so Windows paths with spaces
 * like "OneDrive - Skupina Aktiva" never get split by the shell.
 */
function resolveDrizzleKitBin() {
  try {
    const pkgJson = require.resolve("drizzle-kit/package.json");
    return resolve(dirname(pkgJson), "bin.cjs");
  } catch {
    const fallback = resolve(pkgDir, "node_modules/drizzle-kit/bin.cjs");
    return existsSync(fallback) ? fallback : null;
  }
}

const bin = resolveDrizzleKitBin();
if (!bin) {
  console.error("drizzle-kit ni nameščen. Zaženite: pnpm install");
  process.exit(1);
}

const result = spawnSync(process.execPath, [bin, "migrate", "--config", "drizzle.config.ts"], {
  cwd: pkgDir,
  stdio: "inherit",
  shell: false,
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
