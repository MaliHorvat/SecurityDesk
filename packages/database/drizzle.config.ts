import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env.local") });
config({ path: resolve(process.cwd(), ".env.local") });

const provider = process.env.DB_PROVIDER === "postgresql" ? "postgresql" : "mysql";

export default defineConfig({
  schema:
    provider === "postgresql"
      ? [
          "./src/schema/postgresql.ts",
          "./src/schema/securitydesk-postgresql.ts",
          "./src/schema/cctv-postgresql.ts",
        ]
      : ["./src/schema/mysql.ts", "./src/schema/securitydesk-mysql.ts", "./src/schema/cctv-mysql.ts"],
  out: `./drizzle/${provider}`,
  dialect: provider === "postgresql" ? "postgresql" : "mysql",
  dbCredentials: {
    url:
      process.env.DIRECT_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "mysql://securitydesk_user:CHANGE_ME@localhost:3306/securitydesk",
  },
  strict: true,
  verbose: true,
});
