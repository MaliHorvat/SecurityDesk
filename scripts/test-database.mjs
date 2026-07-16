#!/usr/bin/env node
/**
 * Database connectivity diagnostic.
 * Never prints connection strings that include passwords.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lookup } from "node:dns/promises";
import { createConnection } from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function tcpCheck(host, port) {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host, port, timeout: 5000 }, () => {
      socket.end();
      resolvePromise({ ok: true });
    });
    socket.on("error", (err) => resolvePromise({ ok: false, error: err.message }));
    socket.on("timeout", () => {
      socket.destroy();
      resolvePromise({ ok: false, error: "timeout" });
    });
  });
}

async function main() {
  const env = {
    ...loadEnvFile(resolve(root, ".env.example")),
    ...loadEnvFile(resolve(root, ".env.local")),
    ...process.env,
  };

  const provider = env.DB_PROVIDER === "postgresql" ? "postgresql" : "mysql";
  const host = env.DB_HOST || "localhost";
  const port = Number(env.DB_PORT || (provider === "postgresql" ? 5432 : 3306));
  const name = env.DB_NAME || "securitydesk";
  const user = env.DB_USER || "securitydesk_user";
  const ssl = env.DB_SSL === "true" || env.DB_SSL === "1";

  console.log("=== SecurityDesk db:test ===");
  console.log(`Provider: ${provider}`);
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
  console.log(`Database: ${name}`);
  console.log(`User: ${user}`);
  console.log(`SSL: ${ssl}`);

  try {
    const dns = await lookup(host);
    console.log(`DNS: OK (${dns.address})`);
  } catch (error) {
    console.error(`DNS: FAIL – ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  const tcp = await tcpCheck(host, port);
  if (!tcp.ok) {
    console.error(`TCP: FAIL – ${tcp.error}`);
    console.error(
      "Če baza ne dovoljuje oddaljenih povezav, aplikacija na Vercelu do nje ne bo mogla dostopati, dokler ponudnik ne omogoči zunanjega dostopa.",
    );
    process.exit(1);
  }
  console.log("TCP: OK");

  try {
    if (provider === "postgresql") {
      const postgres = (await import("postgres")).default;
      const url =
        env.DATABASE_URL ||
        `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(env.DB_PASSWORD || "")}@${host}:${port}/${name}${ssl ? "?sslmode=require" : ""}`;
      const sql = postgres(url, { max: 1, ssl: ssl ? "require" : undefined });
      const rows = await sql`select 1 as ok`;
      await sql.end({ timeout: 5 });
      console.log(`Query: OK (select 1 → ${rows[0]?.ok})`);
    } else {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection({
        host,
        port,
        user,
        password: env.DB_PASSWORD || "",
        database: name,
        ssl: ssl ? {} : undefined,
      });
      const [rows] = await conn.query("SELECT 1 AS ok");
      await conn.end();
      console.log(`Query: OK (select 1 → ${Array.isArray(rows) ? rows[0]?.ok : "1"})`);
    }
  } catch (error) {
    console.error(`Query: FAIL – ${error instanceof Error ? error.message : error}`);
    console.error("Geslo in CONNECTION STRING nista izpisana.");
    process.exit(1);
  }

  console.log("Povezava z bazo je uspešna.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
