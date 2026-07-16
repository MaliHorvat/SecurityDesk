import { z } from "zod";

export const configurationSourceSchema = z.enum(["manual", "agent", "vendor_api"]);

export const configurationBackupInputSchema = z.object({
  deviceId: z.string().min(1, "Izberite napravo."),
  source: configurationSourceSchema.default("manual"),
  label: z.string().max(255).optional().or(z.literal("")),
  note: z.string().max(10000).optional().or(z.literal("")),
  configurationText: z.string().min(1, "Konfiguracija je obvezna.").max(200000),
});

export type ConfigurationBackupInput = z.infer<typeof configurationBackupInputSchema>;

