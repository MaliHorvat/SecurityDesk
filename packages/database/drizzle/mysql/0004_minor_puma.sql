CREATE TABLE `configuration_backup` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`source` varchar(128) NOT NULL,
	`label` varchar(255),
	`note` text,
	`checksum_sha256` varchar(64) NOT NULL,
	`encrypted_secret` text NOT NULL,
	`last_checked_at` timestamp,
	`last_checked_by_user_id` varchar(36),
	`is_last_checked` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `configuration_backup_id` PRIMARY KEY(`id`),
	CONSTRAINT `configuration_backup_device_version_uidx` UNIQUE(`device_id`,`version`)
);
--> statement-breakpoint
CREATE TABLE `firmware_advisory` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`vendor` varchar(255) NOT NULL,
	`description` text,
	`severity` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`recommended_action` text,
	`official_url` varchar(1024),
	`due_at` timestamp,
	`last_checked_at` timestamp,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `firmware_advisory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `firmware_affected_model` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`advisory_id` varchar(36) NOT NULL,
	`manufacturer_id` varchar(36) NOT NULL,
	`device_type_id` varchar(36) NOT NULL,
	`version_pattern` varchar(128) NOT NULL,
	`match_strategy` enum('equals','starts_with') NOT NULL DEFAULT 'equals',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `firmware_affected_model_id` PRIMARY KEY(`id`),
	CONSTRAINT `firmware_affected_model_uidx` UNIQUE(`advisory_id`,`manufacturer_id`,`device_type_id`,`version_pattern`)
);
--> statement-breakpoint
CREATE TABLE `firmware_match` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`advisory_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`matched_firmware` varchar(128) NOT NULL,
	`match_strategy` enum('equals','starts_with') NOT NULL DEFAULT 'equals',
	`status` enum('open','in_campaign','resolved') NOT NULL DEFAULT 'open',
	`campaign_id` varchar(36),
	`checked_at` timestamp,
	`resolved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `firmware_match_id` PRIMARY KEY(`id`),
	CONSTRAINT `firmware_match_uidx` UNIQUE(`advisory_id`,`device_id`)
);
--> statement-breakpoint
CREATE TABLE `remediation_campaign` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`advisory_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`due_at` timestamp,
	`notes` text,
	`created_by_user_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `remediation_campaign_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `configuration_backup` ADD CONSTRAINT `configuration_backup_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configuration_backup` ADD CONSTRAINT `configuration_backup_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `configuration_backup` ADD CONSTRAINT `configuration_backup_last_checked_by_user_id_user_id_fk` FOREIGN KEY (`last_checked_by_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_advisory` ADD CONSTRAINT `firmware_advisory_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_affected_model` ADD CONSTRAINT `firmware_affected_model_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_affected_model` ADD CONSTRAINT `firmware_affected_model_advisory_id_firmware_advisory_id_fk` FOREIGN KEY (`advisory_id`) REFERENCES `firmware_advisory`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_affected_model` ADD CONSTRAINT `firmware_affected_model_manufacturer_id_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_affected_model` ADD CONSTRAINT `firmware_affected_model_device_type_id_device_type_id_fk` FOREIGN KEY (`device_type_id`) REFERENCES `device_type`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_match` ADD CONSTRAINT `firmware_match_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_match` ADD CONSTRAINT `firmware_match_advisory_id_firmware_advisory_id_fk` FOREIGN KEY (`advisory_id`) REFERENCES `firmware_advisory`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_match` ADD CONSTRAINT `firmware_match_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `firmware_match` ADD CONSTRAINT `firmware_match_campaign_id_remediation_campaign_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `remediation_campaign`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remediation_campaign` ADD CONSTRAINT `remediation_campaign_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remediation_campaign` ADD CONSTRAINT `remediation_campaign_advisory_id_firmware_advisory_id_fk` FOREIGN KEY (`advisory_id`) REFERENCES `firmware_advisory`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remediation_campaign` ADD CONSTRAINT `remediation_campaign_created_by_user_id_user_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `configuration_backup_org_idx` ON `configuration_backup` (`organization_id`);--> statement-breakpoint
CREATE INDEX `configuration_backup_device_idx` ON `configuration_backup` (`device_id`);--> statement-breakpoint
CREATE INDEX `firmware_advisory_org_idx` ON `firmware_advisory` (`organization_id`);--> statement-breakpoint
CREATE INDEX `firmware_advisory_status_idx` ON `firmware_advisory` (`status`);--> statement-breakpoint
CREATE INDEX `firmware_affected_model_org_idx` ON `firmware_affected_model` (`organization_id`);--> statement-breakpoint
CREATE INDEX `firmware_affected_model_advisory_idx` ON `firmware_affected_model` (`advisory_id`);--> statement-breakpoint
CREATE INDEX `firmware_match_org_idx` ON `firmware_match` (`organization_id`);--> statement-breakpoint
CREATE INDEX `firmware_match_advisory_idx` ON `firmware_match` (`advisory_id`);--> statement-breakpoint
CREATE INDEX `firmware_match_device_idx` ON `firmware_match` (`device_id`);--> statement-breakpoint
CREATE INDEX `remediation_campaign_org_idx` ON `remediation_campaign` (`organization_id`);--> statement-breakpoint
CREATE INDEX `remediation_campaign_advisory_idx` ON `remediation_campaign` (`advisory_id`);