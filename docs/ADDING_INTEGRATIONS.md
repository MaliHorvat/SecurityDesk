# Dodajanje integracij

Implementirajte `DeviceIntegration` v `packages/integrations`:

```ts
export interface DeviceIntegration {
  identify(): Promise<DeviceIdentity>;
  getHealth(): Promise<DeviceHealth>;
  getFirmwareInfo(): Promise<FirmwareInfo>;
  getNetworkInfo(): Promise<NetworkInfo>;
  exportConfiguration?(): Promise<ConfigurationBackup>;
  applyConfiguration?(job: ConfigurationJob): Promise<JobResult>;
}
```

Za razvoj uporabite `DemoDeviceSimulator`. Ne ustvarjajte lažnih “živih” integracij, ki se pretvarjajo, da govorijo s pravimi napravami.
