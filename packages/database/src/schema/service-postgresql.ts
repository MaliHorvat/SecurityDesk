import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organization, user } from "./postgresql";
import { customer, site, device } from "./securitydesk-postgresql";

export const serviceTicketPriorityEnum = pgEnum("service_ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const serviceTicketStatusEnum = pgEnum("service_ticket_status", [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
  "cancelled",
]);

export const workOrderStatusEnum = pgEnum("work_order_status", [
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);

export const serviceReportStatusEnum = pgEnum("service_report_status", ["draft", "final"]);

export const handoverStatusEnum = pgEnum("handover_status", [
  "draft",
  "ready",
  "sent",
  "accepted",
  "superseded",
]);

export const handoverSignerRoleEnum = pgEnum("handover_signer_role", ["contractor", "customer"]);

export const serviceTicket = pgTable(
  "service_ticket",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, { onDelete: "set null" }),
    createdByUserId: varchar("created_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    assignedToUserId: varchar("assigned_to_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 64 }).notNull().default("general"),
    priority: serviceTicketPriorityEnum("priority").notNull().default("normal"),
    status: serviceTicketStatusEnum("status").notNull().default("open"),
    preferredAt: timestamp("preferred_at"),
    attachmentNotes: text("attachment_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("service_ticket_org_idx").on(t.organizationId),
    index("service_ticket_customer_idx").on(t.customerId),
    index("service_ticket_status_idx").on(t.status),
  ],
);

export const workOrder = pgTable(
  "work_order",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ticketId: varchar("ticket_id", { length: 36 })
      .notNull()
      .references(() => serviceTicket.id, { onDelete: "cascade" }),
    assignedToUserId: varchar("assigned_to_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    assignedToName: varchar("assigned_to_name", { length: 255 }),
    status: workOrderStatusEnum("status").notNull().default("planned"),
    scheduledAt: timestamp("scheduled_at"),
    arrivedAt: timestamp("arrived_at"),
    departedAt: timestamp("departed_at"),
    travelCost: doublePrecision("travel_cost").notNull().default(0),
    workDone: text("work_done"),
    measurements: text("measurements"),
    findings: text("findings"),
    recommendations: text("recommendations"),
    materialsJson: text("materials_json"),
    photosJson: text("photos_json"),
    technicianSignatureName: varchar("technician_signature_name", { length: 255 }),
    technicianSignedAt: timestamp("technician_signed_at"),
    technicianSignatureData: text("technician_signature_data"),
    customerSignatureName: varchar("customer_signature_name", { length: 255 }),
    customerSignedAt: timestamp("customer_signed_at"),
    customerSignatureData: text("customer_signature_data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("work_order_org_idx").on(t.organizationId),
    index("work_order_ticket_idx").on(t.ticketId),
  ],
);

export const serviceReport = pgTable(
  "service_report",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ticketId: varchar("ticket_id", { length: 36 })
      .notNull()
      .references(() => serviceTicket.id, { onDelete: "cascade" }),
    workOrderId: varchar("work_order_id", { length: 36 }).references(() => workOrder.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    faultDescription: text("fault_description"),
    workPerformed: text("work_performed"),
    findings: text("findings"),
    recommendations: text("recommendations"),
    customerSummary: text("customer_summary"),
    materialsJson: text("materials_json"),
    photosJson: text("photos_json"),
    technicianName: varchar("technician_name", { length: 255 }),
    status: serviceReportStatusEnum("status").notNull().default("draft"),
    finalizedAt: timestamp("finalized_at"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("service_report_org_idx").on(t.organizationId),
    index("service_report_ticket_idx").on(t.ticketId),
  ],
);

export const handoverPackage = pgTable(
  "handover_package",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: handoverStatusEnum("status").notNull().default("draft"),
    retentionNotes: text("retention_notes"),
    serviceContacts: text("service_contacts"),
    deviceSummary: text("device_summary"),
    ipTable: text("ip_table"),
    notes: text("notes"),
    publicToken: varchar("public_token", { length: 64 }),
    version: integer("version").notNull().default(1),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("handover_package_org_idx").on(t.organizationId),
    index("handover_package_customer_idx").on(t.customerId),
    index("handover_package_token_idx").on(t.publicToken),
  ],
);

export const handoverChecklistItem = pgTable(
  "handover_checklist_item",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    packageId: varchar("package_id", { length: 36 })
      .notNull()
      .references(() => handoverPackage.id, { onDelete: "cascade" }),
    itemKey: varchar("item_key", { length: 64 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    checked: boolean("checked").notNull().default(false),
    checkedAt: timestamp("checked_at"),
    checkedByName: varchar("checked_by_name", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("handover_checklist_org_idx").on(t.organizationId),
    index("handover_checklist_package_idx").on(t.packageId),
  ],
);

export const handoverDocument = pgTable(
  "handover_document",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    packageId: varchar("package_id", { length: 36 })
      .notNull()
      .references(() => handoverPackage.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    docType: varchar("doc_type", { length: 64 }).notNull().default("other"),
    content: text("content"),
    url: varchar("url", { length: 1024 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("handover_document_org_idx").on(t.organizationId),
    index("handover_document_package_idx").on(t.packageId),
  ],
);

export const handoverSignature = pgTable(
  "handover_signature",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    packageId: varchar("package_id", { length: 36 })
      .notNull()
      .references(() => handoverPackage.id, { onDelete: "cascade" }),
    role: handoverSignerRoleEnum("role").notNull(),
    signerName: varchar("signer_name", { length: 255 }).notNull(),
    signedAt: timestamp("signed_at").notNull(),
    signatureData: text("signature_data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("handover_signature_org_idx").on(t.organizationId),
    index("handover_signature_package_idx").on(t.packageId),
  ],
);
