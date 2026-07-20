import { z } from "zod";

export const serviceTicketPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const serviceTicketStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
  "cancelled",
]);
export const workOrderStatusSchema = z.enum(["planned", "in_progress", "completed", "cancelled"]);
export const serviceReportStatusSchema = z.enum(["draft", "final"]);
export const handoverPackageStatusSchema = z.enum([
  "draft",
  "ready",
  "sent",
  "accepted",
  "superseded",
]);

export const SERVICE_TICKET_CATEGORIES = [
  "general",
  "cctv",
  "alarm",
  "access",
  "network",
  "ups",
  "other",
] as const;

export const serviceTicketCategorySchema = z.enum(SERVICE_TICKET_CATEGORIES);

export const materialItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.coerce.number().positive().default(1),
  unit: z.string().max(32).default("kos"),
  notes: z.string().max(500).optional().or(z.literal("")),
  inventoryItemId: z.string().min(1).optional().or(z.literal("")),
  inventorySku: z.string().max(64).optional().or(z.literal("")),
});

export type MaterialItem = z.infer<typeof materialItemSchema>;

export const servicePhotoSchema = z.object({
  kind: z.enum(["before", "after", "other"]).default("other"),
  caption: z.string().max(255).optional().or(z.literal("")),
  url: z.string().max(1024).optional().or(z.literal("")),
});

export type ServicePhoto = z.infer<typeof servicePhotoSchema>;

export const serviceTicketInputSchema = z.object({
  title: z.string().min(1, "Naslov je obvezen.").max(255),
  description: z.string().max(10000).optional().or(z.literal("")),
  customerId: z.string().min(1, "Izberite stranko."),
  siteId: z.string().min(1).optional().or(z.literal("")),
  deviceId: z.string().min(1).optional().or(z.literal("")),
  category: serviceTicketCategorySchema.default("general"),
  priority: serviceTicketPrioritySchema.default("normal"),
  status: serviceTicketStatusSchema.default("open"),
  preferredAt: z.string().optional().or(z.literal("")),
  attachmentNotes: z.string().max(5000).optional().or(z.literal("")),
});

export type ServiceTicketInput = z.infer<typeof serviceTicketInputSchema>;

export const workOrderInputSchema = z.object({
  ticketId: z.string().min(1),
  assignedToName: z.string().max(255).optional().or(z.literal("")),
  status: workOrderStatusSchema.default("planned"),
  scheduledAt: z.string().optional().or(z.literal("")),
  arrivedAt: z.string().optional().or(z.literal("")),
  departedAt: z.string().optional().or(z.literal("")),
  travelCost: z.coerce.number().min(0).default(0),
  workDone: z.string().max(10000).optional().or(z.literal("")),
  measurements: z.string().max(5000).optional().or(z.literal("")),
  findings: z.string().max(10000).optional().or(z.literal("")),
  recommendations: z.string().max(10000).optional().or(z.literal("")),
  materials: z.array(materialItemSchema).default([]),
  photos: z.array(servicePhotoSchema).default([]),
  technicianSignatureName: z.string().max(255).optional().or(z.literal("")),
  technicianSignatureData: z.string().max(200000).optional().or(z.literal("")),
  customerSignatureName: z.string().max(255).optional().or(z.literal("")),
  customerSignatureData: z.string().max(200000).optional().or(z.literal("")),
});

export type WorkOrderInput = z.infer<typeof workOrderInputSchema>;

export const serviceReportInputSchema = z.object({
  ticketId: z.string().min(1),
  workOrderId: z.string().min(1).optional().or(z.literal("")),
  title: z.string().min(1).max(255),
  faultDescription: z.string().max(10000).optional().or(z.literal("")),
  workPerformed: z.string().max(10000).optional().or(z.literal("")),
  findings: z.string().max(10000).optional().or(z.literal("")),
  recommendations: z.string().max(10000).optional().or(z.literal("")),
  customerSummary: z.string().max(5000).optional().or(z.literal("")),
  materials: z.array(materialItemSchema).default([]),
  photos: z.array(servicePhotoSchema).default([]),
  technicianName: z.string().max(255).optional().or(z.literal("")),
  status: serviceReportStatusSchema.default("draft"),
});

export type ServiceReportInput = z.infer<typeof serviceReportInputSchema>;

export const DEFAULT_HANDOVER_CHECKLIST = [
  { key: "system_installed", label: "Sistem je nameščen" },
  { key: "devices_tested", label: "Naprave so testirane" },
  { key: "recording_works", label: "Snemanje deluje" },
  { key: "time_synced", label: "Čas je sinhroniziran" },
  { key: "users_ready", label: "Uporabniki so pripravljeni" },
  { key: "customer_instructions", label: "Stranka je prejela navodila" },
  { key: "passwords_secure", label: "Gesla so bila predana po varnem kanalu" },
  { key: "training_done", label: "Usposabljanje je izvedeno" },
] as const;

export const handoverDocumentTypeSchema = z.enum([
  "device_list",
  "ip_table",
  "port_plan",
  "floor_plan",
  "config",
  "manual",
  "warranty",
  "license",
  "certificate",
  "test_result",
  "statement",
  "other",
]);

export const handoverPackageInputSchema = z.object({
  title: z.string().min(1, "Naslov je obvezen.").max(255),
  description: z.string().max(10000).optional().or(z.literal("")),
  customerId: z.string().min(1, "Izberite stranko."),
  siteId: z.string().min(1).optional().or(z.literal("")),
  status: handoverPackageStatusSchema.default("draft"),
  retentionNotes: z.string().max(5000).optional().or(z.literal("")),
  serviceContacts: z.string().max(5000).optional().or(z.literal("")),
  deviceSummary: z.string().max(20000).optional().or(z.literal("")),
  ipTable: z.string().max(20000).optional().or(z.literal("")),
  notes: z.string().max(10000).optional().or(z.literal("")),
});

export type HandoverPackageInput = z.infer<typeof handoverPackageInputSchema>;

export const handoverDocumentInputSchema = z.object({
  packageId: z.string().min(1),
  title: z.string().min(1).max(255),
  docType: handoverDocumentTypeSchema.default("other"),
  content: z.string().max(50000).optional().or(z.literal("")),
  url: z.string().max(1024).optional().or(z.literal("")),
});

export type HandoverDocumentInput = z.infer<typeof handoverDocumentInputSchema>;

export const handoverSignatureInputSchema = z.object({
  packageId: z.string().min(1),
  role: z.enum(["contractor", "customer"]),
  signerName: z.string().min(1).max(255),
  signatureData: z.string().max(200000).optional().or(z.literal("")),
});

export type HandoverSignatureInput = z.infer<typeof handoverSignatureInputSchema>;

export const TICKET_PRIORITY_LABELS: Record<z.infer<typeof serviceTicketPrioritySchema>, string> = {
  low: "Nizka",
  normal: "Normalna",
  high: "Visoka",
  urgent: "Nujna",
};

export const TICKET_STATUS_LABELS: Record<z.infer<typeof serviceTicketStatusSchema>, string> = {
  open: "Odprt",
  in_progress: "V teku",
  waiting_customer: "Čaka stranko",
  resolved: "Rešen",
  closed: "Zaprt",
  cancelled: "Preklican",
};

export const HANDOVER_STATUS_LABELS: Record<z.infer<typeof handoverPackageStatusSchema>, string> = {
  draft: "Osnutek",
  ready: "Pripravljen",
  sent: "Poslan",
  accepted: "Sprejet",
  superseded: "Nadomeščen",
};

export function parseOptionalDate(value: string | undefined | null): Date | null {
  if (!value || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
