CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` text,
	`password` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`actor_user_id` varchar(36),
	`action` varchar(128) NOT NULL,
	`entity_type` varchar(64),
	`entity_id` varchar(36),
	`ip_address` varchar(64),
	`user_agent` text,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_stat` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customers_count` int NOT NULL DEFAULT 0,
	`sites_count` int NOT NULL DEFAULT 0,
	`devices_count` int NOT NULL DEFAULT 0,
	`open_tickets_count` int NOT NULL DEFAULT 0,
	`online_devices_count` int NOT NULL DEFAULT 0,
	`offline_devices_count` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_stat_id` PRIMARY KEY(`id`),
	CONSTRAINT `dashboard_stat_org_uidx` UNIQUE(`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`role` varchar(64),
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`inviter_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` enum('platform_super_admin','organization_owner','organization_admin','technician','viewer','customer_user') NOT NULL DEFAULT 'viewer',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_org_user_uidx` UNIQUE(`organization_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `module_entitlement` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`module_id` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_entitlement_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_entitlement_uidx` UNIQUE(`organization_id`,`module_id`)
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`logo` text,
	`metadata` text,
	`plan_id` enum('starter','professional','integrator','enterprise') NOT NULL DEFAULT 'starter',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `organization_slug_uidx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `organization_settings` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`locale` varchar(8) NOT NULL DEFAULT 'sl',
	`timezone` varchar(64) NOT NULL DEFAULT 'Europe/Ljubljana',
	`brand_primary_color` varchar(16) DEFAULT '#1d4ed8',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_settings_organization_id_unique` UNIQUE(`organization_id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`ip_address` varchar(64),
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`active_organization_id` varchar(36),
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`plan_id` enum('starter','professional','integrator','enterprise') NOT NULL DEFAULT 'starter',
	`status` enum('active','trialing','past_due','canceled','incomplete') NOT NULL DEFAULT 'active',
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `building` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`site_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `building_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`tax_id` varchar(64),
	`address_line1` varchar(255),
	`address_line2` varchar(255),
	`city` varchar(128),
	`postal_code` varchar(32),
	`country` varchar(64) DEFAULT 'SI',
	`email` varchar(255),
	`phone` varchar(64),
	`notes` text,
	`service_contract` text,
	`status` enum('active','inactive','prospect') NOT NULL DEFAULT 'active',
	`collaboration_started_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `customer_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_contact` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(64),
	`role` varchar(128),
	`is_primary` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_contact_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`site_id` varchar(36),
	`building_id` varchar(36),
	`floor_id` varchar(36),
	`room_id` varchar(36),
	`device_type_id` varchar(36),
	`manufacturer_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`model` varchar(255),
	`serial_number` varchar(128),
	`inventory_number` varchar(128),
	`mac_address` varchar(64),
	`ip_address` varchar(64),
	`subnet_mask` varchar(64),
	`gateway` varchar(64),
	`dns` varchar(255),
	`vlan` int,
	`switch_port` varchar(64),
	`username` varchar(128),
	`firmware` varchar(128),
	`installed_at` timestamp,
	`purchased_at` timestamp,
	`warranty_until` timestamp,
	`supplier` varchar(255),
	`status` enum('active','inactive','maintenance','decommissioned','unknown') NOT NULL DEFAULT 'active',
	`tags` text,
	`notes` text,
	`qr_token` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `device_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_qr_uidx` UNIQUE(`qr_token`)
);
--> statement-breakpoint
CREATE TABLE `device_credential` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`label` varchar(128) NOT NULL DEFAULT 'default',
	`encrypted_secret` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_credential_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_document` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(128),
	`storage_key` varchar(512) NOT NULL,
	`size_bytes` int,
	`kind` enum('photo','manual','config','other') NOT NULL DEFAULT 'other',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_document_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_type` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_type_id` PRIMARY KEY(`id`),
	CONSTRAINT `device_type_org_name_uidx` UNIQUE(`organization_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `floor` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`building_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`level` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `floor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manufacturer` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`website` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manufacturer_id` PRIMARY KEY(`id`),
	CONSTRAINT `manufacturer_org_name_uidx` UNIQUE(`organization_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `room` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`floor_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `room_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`address_line1` varchar(255),
	`city` varchar(128),
	`postal_code` varchar(32),
	`country` varchar(64) DEFAULT 'SI',
	`latitude` double,
	`longitude` double,
	`timezone` varchar(64) NOT NULL DEFAULT 'Europe/Ljubljana',
	`contact_name` varchar(255),
	`contact_phone` varchar(64),
	`access_instructions` text,
	`working_hours` text,
	`security_notes` text,
	`qr_token` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `site_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_qr_uidx` UNIQUE(`qr_token`)
);
--> statement-breakpoint
CREATE TABLE `site_document` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`site_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(128),
	`storage_key` varchar(512) NOT NULL,
	`size_bytes` int,
	`kind` enum('floorplan','photo','contract','other') NOT NULL DEFAULT 'other',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_document_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_stat` ADD CONSTRAINT `dashboard_stat_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation` ADD CONSTRAINT `invitation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation` ADD CONSTRAINT `invitation_inviter_id_user_id_fk` FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member` ADD CONSTRAINT `member_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member` ADD CONSTRAINT `member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_entitlement` ADD CONSTRAINT `module_entitlement_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_settings` ADD CONSTRAINT `organization_settings_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `building` ADD CONSTRAINT `building_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `building` ADD CONSTRAINT `building_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer` ADD CONSTRAINT `customer_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_contact` ADD CONSTRAINT `customer_contact_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_contact` ADD CONSTRAINT `customer_contact_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_building_id_building_id_fk` FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_floor_id_floor_id_fk` FOREIGN KEY (`floor_id`) REFERENCES `floor`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_room_id_room_id_fk` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_device_type_id_device_type_id_fk` FOREIGN KEY (`device_type_id`) REFERENCES `device_type`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device` ADD CONSTRAINT `device_manufacturer_id_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_credential` ADD CONSTRAINT `device_credential_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_credential` ADD CONSTRAINT `device_credential_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_document` ADD CONSTRAINT `device_document_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_document` ADD CONSTRAINT `device_document_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `device_type` ADD CONSTRAINT `device_type_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor` ADD CONSTRAINT `floor_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor` ADD CONSTRAINT `floor_building_id_building_id_fk` FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `manufacturer` ADD CONSTRAINT `manufacturer_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `room` ADD CONSTRAINT `room_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `room` ADD CONSTRAINT `room_floor_id_floor_id_fk` FOREIGN KEY (`floor_id`) REFERENCES `floor`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site` ADD CONSTRAINT `site_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site` ADD CONSTRAINT `site_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_document` ADD CONSTRAINT `site_document_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_document` ADD CONSTRAINT `site_document_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_org_idx` ON `audit_log` (`organization_id`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `invitation_org_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_org_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscription_org_idx` ON `subscription` (`organization_id`);--> statement-breakpoint
CREATE INDEX `building_org_idx` ON `building` (`organization_id`);--> statement-breakpoint
CREATE INDEX `building_site_idx` ON `building` (`site_id`);--> statement-breakpoint
CREATE INDEX `customer_org_idx` ON `customer` (`organization_id`);--> statement-breakpoint
CREATE INDEX `customer_name_idx` ON `customer` (`organization_id`,`name`);--> statement-breakpoint
CREATE INDEX `customer_contact_org_idx` ON `customer_contact` (`organization_id`);--> statement-breakpoint
CREATE INDEX `customer_contact_customer_idx` ON `customer_contact` (`customer_id`);--> statement-breakpoint
CREATE INDEX `device_org_idx` ON `device` (`organization_id`);--> statement-breakpoint
CREATE INDEX `device_site_idx` ON `device` (`site_id`);--> statement-breakpoint
CREATE INDEX `device_customer_idx` ON `device` (`customer_id`);--> statement-breakpoint
CREATE INDEX `device_ip_idx` ON `device` (`organization_id`,`site_id`,`ip_address`);--> statement-breakpoint
CREATE INDEX `device_credential_org_idx` ON `device_credential` (`organization_id`);--> statement-breakpoint
CREATE INDEX `device_credential_device_idx` ON `device_credential` (`device_id`);--> statement-breakpoint
CREATE INDEX `device_document_org_idx` ON `device_document` (`organization_id`);--> statement-breakpoint
CREATE INDEX `device_document_device_idx` ON `device_document` (`device_id`);--> statement-breakpoint
CREATE INDEX `device_type_org_idx` ON `device_type` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_org_idx` ON `floor` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_building_idx` ON `floor` (`building_id`);--> statement-breakpoint
CREATE INDEX `manufacturer_org_idx` ON `manufacturer` (`organization_id`);--> statement-breakpoint
CREATE INDEX `room_org_idx` ON `room` (`organization_id`);--> statement-breakpoint
CREATE INDEX `room_floor_idx` ON `room` (`floor_id`);--> statement-breakpoint
CREATE INDEX `site_org_idx` ON `site` (`organization_id`);--> statement-breakpoint
CREATE INDEX `site_customer_idx` ON `site` (`customer_id`);--> statement-breakpoint
CREATE INDEX `site_document_org_idx` ON `site_document` (`organization_id`);--> statement-breakpoint
CREATE INDEX `site_document_site_idx` ON `site_document` (`site_id`);