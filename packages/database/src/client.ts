import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import mysql from "mysql2/promise";
import postgres from "postgres";
import {
  buildDatabaseUrl,
  resolveDatabaseUrl,
  type ServerEnv,
} from "@securitydesk/config/env";
import { getSchema, type DbProvider } from "./schema/index";
import * as mysqlSchema from "./schema/mysql";
import * as securitydeskMysql from "./schema/securitydesk-mysql";
import * as cctvMysql from "./schema/cctv-mysql";
import * as serviceMysql from "./schema/service-mysql";
import * as networkMysql from "./schema/network-mysql";
import * as configVaultMysql from "./schema/config-vault-mysql";
import * as firmwareGuardMysql from "./schema/firmware-guard-mysql";

type FullSchema = typeof mysqlSchema &
  typeof securitydeskMysql &
  typeof cctvMysql &
  typeof serviceMysql &
  typeof networkMysql &
  typeof configVaultMysql &
  typeof firmwareGuardMysql;

/**
 * Dual MySQL/PostgreSQL client.
 * `db` is intentionally loosely typed so call sites stay dialect-agnostic;
 * runtime schema is selected via DB_PROVIDER.
 */
export type AppDatabase = {
  // Dual-dialect Drizzle client — keep untyped at the boundary to avoid MySQL|PG union call errors.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  schema: FullSchema;
  provider: DbProvider;
  client: unknown;
};

function loadDbEnv(): Pick<
  ServerEnv,
  | "DB_PROVIDER"
  | "DB_HOST"
  | "DB_PORT"
  | "DB_NAME"
  | "DB_USER"
  | "DB_PASSWORD"
  | "DB_SSL"
  | "DATABASE_URL"
  | "DIRECT_DATABASE_URL"
> {
  const provider = (process.env.DB_PROVIDER === "postgresql" ? "postgresql" : "mysql") as DbProvider;
  return {
    DB_PROVIDER: provider,
    DB_HOST: process.env.DB_HOST ?? "localhost",
    DB_PORT: Number(process.env.DB_PORT ?? (provider === "postgresql" ? 5432 : 3306)),
    DB_NAME: process.env.DB_NAME ?? "securitydesk",
    DB_USER: process.env.DB_USER ?? "securitydesk_user",
    DB_PASSWORD: process.env.DB_PASSWORD ?? "",
    DB_SSL: process.env.DB_SSL === "true" || process.env.DB_SSL === "1",
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL || undefined,
  };
}

export function getConnectionUrl(preferDirect = false): string {
  const env = loadDbEnv();
  if (preferDirect && env.DIRECT_DATABASE_URL) {
    return env.DIRECT_DATABASE_URL;
  }
  return resolveDatabaseUrl(env);
}

export function createDb(options?: { url?: string; provider?: DbProvider }): AppDatabase {
  const env = loadDbEnv();
  const provider = options?.provider ?? env.DB_PROVIDER;
  const url = options?.url ?? getConnectionUrl();
  const schema = getSchema(provider) as FullSchema;

  if (provider === "postgresql") {
    const client = postgres(url, {
      ssl: env.DB_SSL ? "require" : undefined,
      max: 10,
    });
    const db = drizzlePg(client, { schema });
    return { db, client, provider, schema };
  }

  const pool = mysql.createPool(url);
  const db = drizzleMysql(pool, { schema, mode: "default" });
  return { db, client: pool, provider, schema };
}

let singleton: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (!singleton) {
    singleton = createDb();
  }
  return singleton;
}

export { buildDatabaseUrl, resolveDatabaseUrl };
