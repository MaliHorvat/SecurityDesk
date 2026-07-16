import * as mysqlSchema from "./mysql";
import * as postgresqlSchema from "./postgresql";

export type DbProvider = "mysql" | "postgresql";

export function getProviderFromEnv(): DbProvider {
  const value = process.env.DB_PROVIDER?.toLowerCase();
  return value === "postgresql" ? "postgresql" : "mysql";
}

export function getSchema(provider: DbProvider = getProviderFromEnv()) {
  return provider === "postgresql" ? postgresqlSchema : mysqlSchema;
}
