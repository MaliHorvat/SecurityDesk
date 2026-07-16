import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate", "--config", resolve(root, "../drizzle.config.ts")], {
  cwd: resolve(root, ".."),
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
