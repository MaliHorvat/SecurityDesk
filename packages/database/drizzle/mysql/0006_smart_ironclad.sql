CREATE TABLE `agent_enrollment_token` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`site_id` varchar(36),
	`created_by_user_id` varchar(36),
	`label` varchar(255),
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`used_by_agent_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_enrollment_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_enrollment_token_hash_uidx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_agent` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`site_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`hostname` varchar(255),
	`version` varchar(64),
	`token_hash` varchar(64) NOT NULL,
	`status` enum('pending','active','offline','revoked') NOT NULL DEFAULT 'pending',
	`last_heartbeat_at` timestamp,
	`last_ip` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `monitoring_agent_id` PRIMARY KEY(`id`),
	CONSTRAINT `monitoring_agent_token_uidx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_check` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`agent_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`check_type` enum('ping','tcp','http','https','rtsp') NOT NULL DEFAULT 'ping',
	`target_host` varchar(255) NOT NULL,
	`target_port` int,
	`target_path` varchar(512),
	`interval_seconds` int NOT NULL DEFAULT 60,
	`timeout_ms` int NOT NULL DEFAULT 5000,
	`enabled` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `monitoring_check_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_check_result` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`check_id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`agent_id` varchar(36),
	`status` enum('online','offline','degraded','error','unknown') NOT NULL DEFAULT 'unknown',
	`latency_ms` int,
	`message` text,
	`checked_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitoring_check_result_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `member` MODIFY COLUMN `role` varchar(64) NOT NULL DEFAULT 'organization_owner';--> statement-breakpoint
ALTER TABLE `agent_enrollment_token` ADD CONSTRAINT `agent_enrollment_token_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_enrollment_token` ADD CONSTRAINT `agent_enrollment_token_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_enrollment_token` ADD CONSTRAINT `agent_enrollment_token_created_by_user_id_user_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_agent` ADD CONSTRAINT `monitoring_agent_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_agent` ADD CONSTRAINT `monitoring_agent_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check` ADD CONSTRAINT `monitoring_check_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check` ADD CONSTRAINT `monitoring_check_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check` ADD CONSTRAINT `monitoring_check_agent_id_monitoring_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `monitoring_agent`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check_result` ADD CONSTRAINT `monitoring_check_result_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check_result` ADD CONSTRAINT `monitoring_check_result_check_id_monitoring_check_id_fk` FOREIGN KEY (`check_id`) REFERENCES `monitoring_check`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check_result` ADD CONSTRAINT `monitoring_check_result_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_check_result` ADD CONSTRAINT `monitoring_check_result_agent_id_monitoring_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `monitoring_agent`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `agent_enrollment_token_org_idx` ON `agent_enrollment_token` (`organization_id`);--> statement-breakpoint
CREATE INDEX `monitoring_agent_org_idx` ON `monitoring_agent` (`organization_id`);--> statement-breakpoint
CREATE INDEX `monitoring_agent_site_idx` ON `monitoring_agent` (`site_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_org_idx` ON `monitoring_check` (`organization_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_device_idx` ON `monitoring_check` (`device_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_agent_idx` ON `monitoring_check` (`agent_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_result_org_idx` ON `monitoring_check_result` (`organization_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_result_check_idx` ON `monitoring_check_result` (`check_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_result_device_idx` ON `monitoring_check_result` (`device_id`);--> statement-breakpoint
CREATE INDEX `monitoring_check_result_checked_idx` ON `monitoring_check_result` (`checked_at`);