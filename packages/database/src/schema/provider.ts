import * as mysqlSchema from "./mysql";
import * as postgresqlSchema from "./postgresql";
import * as securitydeskMysql from "./securitydesk-mysql";
import * as securitydeskPostgresql from "./securitydesk-postgresql";
import * as cctvMysql from "./cctv-mysql";
import * as cctvPostgresql from "./cctv-postgresql";
import * as serviceMysql from "./service-mysql";
import * as servicePostgresql from "./service-postgresql";
import * as networkMysql from "./network-mysql";
import * as networkPostgresql from "./network-postgresql";
import * as configVaultMysql from "./config-vault-mysql";
import * as configVaultPostgresql from "./config-vault-postgresql";
import * as firmwareGuardMysql from "./firmware-guard-mysql";
import * as firmwareGuardPostgresql from "./firmware-guard-postgresql";
import * as monitoringMysql from "./monitoring-mysql";
import * as monitoringPostgresql from "./monitoring-postgresql";
import * as cameraDeployMysql from "./camera-deploy-mysql";
import * as cameraDeployPostgresql from "./camera-deploy-postgresql";

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
      ...networkPostgresql,
      ...configVaultPostgresql,
      ...firmwareGuardPostgresql,
      ...monitoringPostgresql,
      ...cameraDeployPostgresql,
    };
  }
  return {
    ...mysqlSchema,
    ...securitydeskMysql,
    ...cctvMysql,
    ...serviceMysql,
    ...networkMysql,
    ...configVaultMysql,
    ...firmwareGuardMysql,
    ...monitoringMysql,
    ...cameraDeployMysql,
  };
}
