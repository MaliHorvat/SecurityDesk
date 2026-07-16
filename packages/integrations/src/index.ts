export type DeviceIdentity = {
  vendor: string;
  model: string;
  serialNumber?: string;
  firmware?: string;
  macAddress?: string;
};

export type DeviceHealth = {
  status: "online" | "warning" | "offline" | "maintenance" | "unknown";
  message?: string;
  checkedAt: string;
};

export type FirmwareInfo = {
  current?: string;
  latestKnown?: string;
  isOutdated?: boolean;
};

export type NetworkInfo = {
  ipAddress?: string;
  subnetMask?: string;
  gateway?: string;
  dns?: string[];
  vlan?: number;
};

export type ConfigurationBackup = {
  format: string;
  content: string | Buffer;
  checksum: string;
  capturedAt: string;
};

export type ConfigurationJob = {
  id: string;
  payload: Record<string, unknown>;
  expiresAt: string;
};

export type JobResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Standardized vendor plugin interface.
 * Real adapters (Axis, Hikvision, …) implement this contract.
 */
export interface DeviceIntegration {
  readonly id: string;
  readonly vendor: string;
  identify(): Promise<DeviceIdentity>;
  getHealth(): Promise<DeviceHealth>;
  getFirmwareInfo(): Promise<FirmwareInfo>;
  getNetworkInfo(): Promise<NetworkInfo>;
  exportConfiguration?(): Promise<ConfigurationBackup>;
  applyConfiguration?(job: ConfigurationJob): Promise<JobResult>;
}

/** Demo simulator — clearly marked, not a real device integration. */
export class DemoDeviceSimulator implements DeviceIntegration {
  readonly id = "demo-simulator";
  readonly vendor = "Demo";

  async identify(): Promise<DeviceIdentity> {
    return {
      vendor: "Demo",
      model: "Simulator Cam 1",
      serialNumber: "DEMO-0001",
      firmware: "1.0.0-sim",
      macAddress: "00:11:22:33:44:55",
    };
  }

  async getHealth(): Promise<DeviceHealth> {
    return {
      status: "online",
      message: "Simulator – ni prava naprava",
      checkedAt: new Date().toISOString(),
    };
  }

  async getFirmwareInfo(): Promise<FirmwareInfo> {
    return { current: "1.0.0-sim", latestKnown: "1.0.0-sim", isOutdated: false };
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    return {
      ipAddress: "192.168.1.50",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
      dns: ["8.8.8.8"],
      vlan: 101,
    };
  }
}

export function listIntegrations(): DeviceIntegration[] {
  return [new DemoDeviceSimulator()];
}
