import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("SecurityDesk"),
  APP_URL: z.string().url(),
  APP_TIMEZONE: z.string().default("Europe/Ljubljana"),
  DEFAULT_LOCALE: z.enum(["sl", "en"]).default("sl"),

  DB_PROVIDER: z.enum(["mysql", "postgresql"]).default("mysql"),
  DB_HOST: z.string().min(1, "Manjka DB_HOST. Vnesite naslov podatkovnega strežnika v .env.local."),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1, "Manjka DB_NAME. Vnesite ime podatkovne baze v .env.local."),
  DB_USER: z.string().min(1, "Manjka DB_USER. Vnesite uporabniško ime baze v .env.local."),
  DB_PASSWORD: z.string().min(1, "Manjka DB_PASSWORD. Vnesite geslo baze v .env.local."),
  DB_SSL: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  DIRECT_DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),

  AUTH_SECRET: z.string().min(32, "Manjka AUTH_SECRET. Zaženite pnpm setup."),
  ENCRYPTION_KEY: z.string().min(32, "Manjka ENCRYPTION_KEY. Zaženite pnpm setup."),
  CRON_SECRET: z.string().min(16, "Manjka CRON_SECRET. Zaženite pnpm setup."),
  AGENT_SIGNING_SECRET: z.string().min(16, "Manjka AGENT_SIGNING_SECRET. Zaženite pnpm setup."),

  MAIL_DRIVER: z.enum(["console", "smtp"]).default("console"),
  MAIL_FROM_NAME: z.string().default("SecurityDesk"),
  MAIL_FROM_ADDRESS: z.string().email().default("noreply@example.com"),
  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),

  STORAGE_DRIVER: z.enum(["local", "database", "s3", "vercel_blob"]).default("local"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(10),
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_REGION: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  BLOB_READ_WRITE_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),

  AI_PROVIDER: z.enum(["disabled", "openai", "anthropic", "google", "ollama"]).default("disabled"),
  AI_MODEL: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_GENERATIVE_AI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),

  BILLING_PROVIDER: z.enum(["disabled", "stripe"]).default("disabled"),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),

  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().optional()),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("SecurityDesk"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().optional()),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(options?: { strict?: boolean }): ServerEnv {
  if (cachedServerEnv && options?.strict !== false) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".") || "config";
      return `${path}: ${issue.message}`;
    });
    throw new Error(`Neveljavna konfiguracija okolja:\n${messages.join("\n")}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function buildDatabaseUrl(env: {
  DB_PROVIDER: "mysql" | "postgresql";
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL?: boolean;
}): string {
  const user = encodeURIComponent(env.DB_USER);
  const password = encodeURIComponent(env.DB_PASSWORD);
  const protocol = env.DB_PROVIDER === "postgresql" ? "postgresql" : "mysql";
  const sslQuery =
    env.DB_PROVIDER === "postgresql"
      ? env.DB_SSL
        ? "?sslmode=require"
        : ""
      : env.DB_SSL
        ? "?ssl=true"
        : "";

  return `${protocol}://${user}:${password}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}${sslQuery}`;
}

export function resolveDatabaseUrl(
  env: Pick<
    ServerEnv,
    | "DATABASE_URL"
    | "DB_PROVIDER"
    | "DB_HOST"
    | "DB_PORT"
    | "DB_NAME"
    | "DB_USER"
    | "DB_PASSWORD"
    | "DB_SSL"
  >,
): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  return buildDatabaseUrl(env);
}
