import { getAppUrl } from "@/lib/app";
import { getDb } from "@securitydesk/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type HealthCheck = {
  ok: boolean;
  appUrl: string;
  nodeEnv: string;
  vercel: boolean;
  config: {
    authSecret: boolean;
    encryptionKey: boolean;
    dbHost: boolean;
    dbName: boolean;
    dbUser: boolean;
    dbPassword: boolean;
    databaseUrl: boolean;
  };
  database?: { ok: boolean; error?: string };
};

export async function GET() {
  const payload: HealthCheck = {
    ok: false,
    appUrl: getAppUrl(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercel: process.env.VERCEL === "1",
    config: {
      authSecret: Boolean(process.env.AUTH_SECRET?.trim()),
      encryptionKey: Boolean(process.env.ENCRYPTION_KEY?.trim()),
      dbHost: Boolean(process.env.DB_HOST?.trim()),
      dbName: Boolean(process.env.DB_NAME?.trim()),
      dbUser: Boolean(process.env.DB_USER?.trim()),
      dbPassword: Boolean(process.env.DB_PASSWORD?.trim()),
      databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    },
  };

  const missing = Object.entries(payload.config)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  if (missing.length > 0) {
    return Response.json(
      {
        ...payload,
        ok: false,
        error: `Manjkajoče okoljske spremenljivke: ${missing.join(", ")}`,
      },
      { status: 503 },
    );
  }

  try {
    const { db, provider } = getDb();
    if (provider === "postgresql") {
      await db.execute(sql`select 1 as ok`);
    } else {
      await db.execute(sql`SELECT 1 AS ok`);
    }

    payload.database = { ok: true };
    payload.ok = true;
    return Response.json(payload);
  } catch (error) {
    payload.database = {
      ok: false,
      error: error instanceof Error ? error.message : "Neznana napaka baze",
    };
    return Response.json(
      {
        ...payload,
        ok: false,
        error: "Povezava z bazo ni uspela. Preverite DB_* na Vercelu in dovoljenja za oddaljene povezave.",
      },
      { status: 503 },
    );
  }
}
