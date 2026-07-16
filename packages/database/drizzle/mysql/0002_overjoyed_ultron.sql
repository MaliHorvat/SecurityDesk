CREATE TABLE `handover_checklist_item` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`item_key` varchar(64) NOT NULL,
	`label` varchar(255) NOT NULL,
	`checked` boolean NOT NULL DEFAULT false,
	`checked_at` timestamp,
	`checked_by_name` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handover_checklist_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handover_document` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`doc_type` varchar(64) NOT NULL DEFAULT 'other',
	`content` text,
	`url` varchar(1024),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handover_document_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handover_package` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`site_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','ready','sent','accepted','superseded') NOT NULL DEFAULT 'draft',
	`retention_notes` text,
	`service_contacts` text,
	`device_summary` text,
	`ip_table` text,
	`notes` text,
	`public_token` varchar(64),
	`version` int NOT NULL DEFAULT 1,
	`accepted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `handover_package_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handover_signature` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`role` enum('contractor','customer') NOT NULL,
	`signer_name` varchar(255) NOT NULL,
	`signed_at` timestamp NOT NULL,
	`signature_data` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `handover_signature_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_report` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`work_order_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`fault_description` text,
	`work_performed` text,
	`findings` text,
	`recommendations` text,
	`customer_summary` text,
	`materials_json` text,
	`photos_json` text,
	`technician_name` varchar(255),
	`status` enum('draft','final') NOT NULL DEFAULT 'draft',
	`finalized_at` timestamp,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_ticket` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`site_id` varchar(36),
	`device_id` varchar(36),
	`created_by_user_id` varchar(36),
	`assigned_to_user_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`status` enum('open','in_progress','waiting_customer','resolved','closed','cancelled') NOT NULL DEFAULT 'open',
	`preferred_at` timestamp,
	`attachment_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `service_ticket_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_order` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`assigned_to_user_id` varchar(36),
	`assigned_to_name` varchar(255),
	`status` enum('planned','in_progress','completed','cancelled') NOT NULL DEFAULT 'planned',
	`scheduled_at` timestamp,
	`arrived_at` timestamp,
	`departed_at` timestamp,
	`travel_cost` double NOT NULL DEFAULT 0,
	`work_done` text,
	`measurements` text,
	`findings` text,
	`recommendations` text,
	`materials_json` text,
	`photos_json` text,
	`technician_signature_name` varchar(255),
	`technician_signed_at` timestamp,
	`technician_signature_data` text,
	`customer_signature_name` varchar(255),
	`customer_signed_at` timestamp,
	`customer_signature_data` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `work_order_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `handover_checklist_item` ADD CONSTRAINT `handover_checklist_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_checklist_item` ADD CONSTRAINT `handover_checklist_item_package_id_handover_package_id_fk` FOREIGN KEY (`package_id`) REFERENCES `handover_package`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_document` ADD CONSTRAINT `handover_document_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_document` ADD CONSTRAINT `handover_document_package_id_handover_package_id_fk` FOREIGN KEY (`package_id`) REFERENCES `handover_package`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_package` ADD CONSTRAINT `handover_package_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_package` ADD CONSTRAINT `handover_package_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_package` ADD CONSTRAINT `handover_package_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_signature` ADD CONSTRAINT `handover_signature_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handover_signature` ADD CONSTRAINT `handover_signature_package_id_handover_package_id_fk` FOREIGN KEY (`package_id`) REFERENCES `handover_package`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_report` ADD CONSTRAINT `service_report_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_report` ADD CONSTRAINT `service_report_ticket_id_service_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `service_ticket`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_report` ADD CONSTRAINT `service_report_work_order_id_work_order_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_order`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_ticket` ADD CONSTRAINT `service_ticket_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_ticket` ADD CONSTRAINT `service_ticket_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_ticket` ADD CONSTRAINT `service_ticket_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_ticket` ADD CONSTRAINT `service_ticket_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_ticket` ADD CONSTRAINT `service_ticket_created_by_user_id_user_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_ticket` ADD CONSTRAINT `service_ticket_assigned_to_user_id_user_id_fk` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order` ADD CONSTRAINT `work_order_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order` ADD CONSTRAINT `work_order_ticket_id_service_ticket_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `service_ticket`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order` ADD CONSTRAINT `work_order_assigned_to_user_id_user_id_fk` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `handover_checklist_org_idx` ON `handover_checklist_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `handover_checklist_package_idx` ON `handover_checklist_item` (`package_id`);--> statement-breakpoint
CREATE INDEX `handover_document_org_idx` ON `handover_document` (`organization_id`);--> statement-breakpoint
CREATE INDEX `handover_document_package_idx` ON `handover_document` (`package_id`);--> statement-breakpoint
CREATE INDEX `handover_package_org_idx` ON `handover_package` (`organization_id`);--> statement-breakpoint
CREATE INDEX `handover_package_customer_idx` ON `handover_package` (`customer_id`);--> statement-breakpoint
CREATE INDEX `handover_package_token_idx` ON `handover_package` (`public_token`);--> statement-breakpoint
CREATE INDEX `handover_signature_org_idx` ON `handover_signature` (`organization_id`);--> statement-breakpoint
CREATE INDEX `handover_signature_package_idx` ON `handover_signature` (`package_id`);--> statement-breakpoint
CREATE INDEX `service_report_org_idx` ON `service_report` (`organization_id`);--> statement-breakpoint
CREATE INDEX `service_report_ticket_idx` ON `service_report` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `service_ticket_org_idx` ON `service_ticket` (`organization_id`);--> statement-breakpoint
CREATE INDEX `service_ticket_customer_idx` ON `service_ticket` (`customer_id`);--> statement-breakpoint
CREATE INDEX `service_ticket_status_idx` ON `service_ticket` (`status`);--> statement-breakpoint
CREATE INDEX `work_order_org_idx` ON `work_order` (`organization_id`);--> statement-breakpoint
CREATE INDEX `work_order_ticket_idx` ON `work_order` (`ticket_id`);