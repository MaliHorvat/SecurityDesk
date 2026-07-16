import { z } from "zod";

export const firmwareSeveritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const firmwareVersionMatchStrategySchema = z.enum(["equals", "starts_with"]);

export const firmwareAdvisoryInputSchema = z.object({
  title: z.string().min(1, "Naslov je obvezen.").max(255),
  vendor: z.string().min(1, "Proizvajalec je obvezen.").max(255),
  description: z.string().max(20000).optional().or(z.literal("")),
  severity: firmwareSeveritySchema.default("normal"),
  recommendedAction: z.string().max(20000).optional().or(z.literal("")),
  officialUrl: z.string().max(1024).optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
});

export type FirmwareAdvisoryInput = z.infer<typeof firmwareAdvisoryInputSchema>;

export const firmwareAffectedModelInputSchema = z.object({
  manufacturerName: z.string().min(1, "Proizvajalec je obvezen.").max(255),
  deviceTypeName: z.string().min(1, "Tip naprave je obvezen.").max(128),
  versionPattern: z.string().min(1, "Velja obvezna verzija/pattern.").max(128),
  matchStrategy: firmwareVersionMatchStrategySchema.default("equals"),
  notes: z.string().max(10000).optional().or(z.literal("")),
});

export type FirmwareAffectedModelInput = z.infer<typeof firmwareAffectedModelInputSchema>;

export const remediationCampaignInputSchema = z.object({
  title: z.string().min(1, "Naslov je obvezen.").max(255),
  dueAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(10000).optional().or(z.literal("")),
});

export type RemediationCampaignInput = z.infer<typeof remediationCampaignInputSchema>;

