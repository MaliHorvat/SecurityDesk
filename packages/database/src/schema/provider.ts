import * as mysqlSchema from "./mysql";
import * as postgresqlSchema from "./postgresql";
import * as securitydeskMysql from "./securitydesk-mysql";
import * as securitydeskPostgresql from "./securitydesk-postgresql";
import * as cctvMysql from "./cctv-mysql";
import * as cctvPostgresql from "./cctv-postgresql";

export type DbProvider = "mysql" | "postgresql";

export function getProviderFromEnv(): DbProvider {
  const value = process.env.DB_PROVIDER?.toLowerCase();
  return value === "postgresql" ? "postgresql" : "mysql";
}

export function getSchema(provider: DbProvider = getProviderFromEnv()) {
  if (provider === "postgresql") {
    return { ...postgresqlSchema, ...securitydeskPostgresql, ...cctvPostgresql };
  }
  return { ...mysqlSchema, ...securitydeskMysql, ...cctvMysql };
}
