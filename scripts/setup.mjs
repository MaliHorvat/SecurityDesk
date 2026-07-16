#!/usr/bin/env node
/**
 * Interactive setup for SecurityDesk local development.
 * Does not echo passwords. Creates .env.local from .env.example when missing.
 */
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { lookup } from "node:dns/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envExample = resolve(root, ".env.example");
const envLocal = resolve(root, ".env.local");

function secret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function buildDatabaseUrl({ provider, user, password, host, port, name, ssl }) {
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const protocol = provider === "postgresql" ? "postgresql" : "mysql";
  const sslQuery =
    provider === "postgresql" ? (ssl ? "?sslmode=require" : "") : ssl ? "?ssl=true" : "";
  return `${protocol}://${u}:${p}@${host}:${port}/${name}${sslQuery}`;
}

function upsertEnv(content, key, value) {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) {
    return content.replace(re, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

async function promptHidden(rl, question) {
  // Avoid echoing password: use readline with muted stdout via manual stdin read when possible.
  output.write(question);
  return await new Promise((resolvePromise) => {
    const onData = (char) => {
      const str = char.toString("utf8");
      if (str === "\n" || str === "\r" || str === "\u0004") {
        input.pause();
        input.removeListener("data", onData);
        output.write("\n");
        resolvePromise(buffer);
        return;
      }
      if (str === "\u0003") {
        process.exit(1);
      }
      if (str === "\u007f" || str === "\b") {
        buffer = buffer.slice(0, -1);
        return;
      }
      buffer += str;
    };
    let buffer = "";
    input.resume();
    input.setRawMode?.(true);
    input.on("data", onData);
  }).finally(() => {
    input.setRawMode?.(false);
  });
}

async function main() {
  console.log("\n=== SecurityDesk setup ===\n");

  if (!existsSync(envLocal)) {
    if (!existsSync(envExample)) {
      console.error("Manjka .env.example");
      process.exit(1);
    }
    copyFileSync(envExample, envLocal);
    console.log("Ustvarjena datoteka .env.local iz .env.example");
  } else {
    console.log("Najdena obstoječa .env.local");
  }

  const rl = createInterface({ input, output });
  try {
    const providerRaw = (await rl.question('Vrsta baze (mysql/postgresql) [mysql]: ')).trim() || "mysql";
    const provider = providerRaw === "postgresql" ? "postgresql" : "mysql";
    const defaultPort = provider === "postgresql" ? "5432" : "3306";
    const host = (await rl.question(`DB host [localhost]: `)).trim() || "localhost";
    const port = (await rl.question(`DB port [${defaultPort}]: `)).trim() || defaultPort;
    const name = (await rl.question(`Ime baze [securitydesk]: `)).trim() || "securitydesk";
    const user = (await rl.question(`DB uporabnik [securitydesk_user]: `)).trim() || "securitydesk_user";
    const password = await promptHidden(rl, "DB geslo: ");
    const sslRaw = (await rl.question("SSL (true/false) [false]: ")).trim() || "false";
    const ssl = sslRaw === "true" || sslRaw === "1";

    const databaseUrl = buildDatabaseUrl({
      provider,
      user,
      password,
      host,
      port,
      name,
      ssl,
    });

    let content = readFileSync(envLocal, "utf8");
    content = upsertEnv(content, "DB_PROVIDER", provider);
    content = upsertEnv(content, "DB_HOST", host);
    content = upsertEnv(content, "DB_PORT", port);
    content = upsertEnv(content, "DB_NAME", name);
    content = upsertEnv(content, "DB_USER", user);
    content = upsertEnv(content, "DB_PASSWORD", password);
    content = upsertEnv(content, "DB_SSL", String(ssl));
    content = upsertEnv(content, "DATABASE_URL", databaseUrl);

    for (const key of ["AUTH_SECRET", "ENCRYPTION_KEY", "CRON_SECRET", "AGENT_SIGNING_SECRET"]) {
      const existing = content.match(new RegExp(`^${key}="?(.*?)"?$`, "m"))?.[1];
      if (!existing) {
        content = upsertEnv(content, key, secret(key === "AUTH_SECRET" || key === "ENCRYPTION_KEY" ? 48 : 32));
      }
    }

    writeFileSync(envLocal, content, "utf8");
    console.log("\n.shranjene nastavitve (geslo ni izpisano).");

    console.log("\nPreverjam DNS…");
    try {
      await lookup(host);
      console.log(`DNS OK za ${host}`);
    } catch {
      console.warn(`DNS preverjanje ni uspelo za ${host}. Preverite host.`);
    }

    console.log("Preverjam TCP povezavo…");
    const ok = await new Promise((resolvePromise) => {
      const socket = createConnection({ host, port: Number(port), timeout: 5000 }, () => {
        socket.end();
        resolvePromise(true);
      });
      socket.on("error", () => resolvePromise(false));
      socket.on("timeout", () => {
        socket.destroy();
        resolvePromise(false);
      });
    });
    console.log(ok ? "TCP povezava uspešna." : "TCP povezava ni uspela – preverite firewall / dovoljenja.");

    console.log(`\nORM shema: ${provider === "postgresql" ? "postgresql" : "mysql"}`);
    console.log("\nNaslednji koraki:");
    console.log("  1. pnpm install");
    console.log("  2. pnpm db:generate");
    console.log("  3. pnpm db:migrate");
    console.log("  4. pnpm db:seed   (opcijsko)");
    console.log("  5. pnpm dev");
    console.log("\nBrez interaktivnega setupa lahko ročno izpolnite .env.local.\n");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
