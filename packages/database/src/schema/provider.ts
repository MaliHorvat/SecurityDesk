import * as mysqlSchema from "./mysql";
import * as postgresqlSchema from "./postgresql";
import * as securitydeskMysql from "./securitydesk-mysql";
import * as securitydeskPostgresql from "./securitydesk-postgresql";
import * as cctvMysql from "./cctv-mysql";
import * as cctvPostgresql from "./cctv-postgresql";
import * as serviceMysql from "./service-mysql";
import * as servicePostgresql from "./service-postgresql";

export type DbProvider = "mysql" | "postgresql";

export function getProviderFromEnv(): DbProvider {
  const value = process.env.DB_PROVIDER?.toLowerCase();
  return value === "postgresql" ? "postgresql" : "mysql";
}

export function getSchema(provider: DbProvider = getProviderFromEnv()) {
  if (provider === "postgresql") {
    return {
      ...postgresqlSchema,
      ...securitydeskPostgresql,
      ...cctvPostgresql,
      ...servicePostgresql,
    };
  }
  return { ...mysqlSchema, ...securitydeskMysql, ...cctvMysql, ...serviceMysql };
}
