CREATE TABLE `desktop_api_token` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`organization_id` varchar(36),
	`token_hash` varchar(128) NOT NULL,
	`name` varchar(255),
	`expires_at` timestamp,
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	CONSTRAINT `desktop_api_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `desktop_api_token_hash_uidx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `desktop_installation` (
	`id` varchar(36) NOT NULL,
	`installation_id` varchar(64) NOT NULL,
	`organization_id` varchar(36),
	`user_id` varchar(36),
	`device_name` varchar(255),
	`platform` enum('windows','macos','linux') NOT NULL,
	`architecture` enum('x86_64','aarch64') NOT NULL,
	`os_version` varchar(128),
	`current_version` varchar(32),
	`update_channel` enum('internal','beta','stable') NOT NULL DEFAULT 'stable',
	`last_seen_at` timestamp,
	`last_update_check_at` timestamp,
	`last_offered_version` varchar(32),
	`last_installed_version` varchar(32),
	`update_status` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `desktop_installation_id` PRIMARY KEY(`id`),
	CONSTRAINT `desktop_installation_id_uidx` UNIQUE(`installation_id`)
);
--> statement-breakpoint
CREATE TABLE `desktop_release` (
	`id` varchar(36) NOT NULL,
	`version` varchar(32) NOT NULL,
	`channel` enum('internal','beta','stable') NOT NULL DEFAULT 'internal',
	`title` varchar(255) NOT NULL,
	`release_notes` text,
	`status` enum('draft','testing','published','paused','withdrawn','archived') NOT NULL DEFAULT 'draft',
	`is_mandatory` boolean NOT NULL DEFAULT false,
	`minimum_supported_version` varchar(32),
	`rollout_percentage` int NOT NULL DEFAULT 100,
	`published_at` timestamp,
	`available_from` timestamp,
	`expires_at` timestamp,
	`created_by_id` varchar(36),
	`published_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `desktop_release_id` PRIMARY KEY(`id`),
	CONSTRAINT `desktop_release_version_channel_uidx` UNIQUE(`version`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `desktop_release_artifact` (
	`id` varchar(36) NOT NULL,
	`desktop_release_id` varchar(36) NOT NULL,
	`platform` enum('windows','macos','linux') NOT NULL,
	`architecture` enum('x86_64','aarch64') NOT NULL,
	`package_type` varchar(32) NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`download_url_reference` text,
	`signature` text,
	`sha256` varchar(64),
	`file_size` int,
	`original_file_name` varchar(255),
	`code_signing_status` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `desktop_release_artifact_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `desktop_update_event` (
	`id` varchar(36) NOT NULL,
	`desktop_installation_id` varchar(36) NOT NULL,
	`desktop_release_id` varchar(36),
	`event_type` varchar(32) NOT NULL,
	`from_version` varchar(32),
	`to_version` varchar(32),
	`error_code` varchar(64),
	`error_message` text,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `desktop_update_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `desktop_api_token` ADD CONSTRAINT `desktop_api_token_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_api_token` ADD CONSTRAINT `desktop_api_token_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_installation` ADD CONSTRAINT `desktop_installation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_installation` ADD CONSTRAINT `desktop_installation_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_release` ADD CONSTRAINT `desktop_release_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_release` ADD CONSTRAINT `desktop_release_published_by_id_user_id_fk` FOREIGN KEY (`published_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_release_artifact` ADD CONSTRAINT `desktop_artifact_release_id_fk` FOREIGN KEY (`desktop_release_id`) REFERENCES `desktop_release`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_update_event` ADD CONSTRAINT `desktop_update_event_installation_fk` FOREIGN KEY (`desktop_installation_id`) REFERENCES `desktop_installation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `desktop_update_event` ADD CONSTRAINT `desktop_update_event_release_fk` FOREIGN KEY (`desktop_release_id`) REFERENCES `desktop_release`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `desktop_api_token_user_idx` ON `desktop_api_token` (`user_id`);--> statement-breakpoint
CREATE INDEX `desktop_installation_org_idx` ON `desktop_installation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `desktop_installation_user_idx` ON `desktop_installation` (`user_id`);--> statement-breakpoint
CREATE INDEX `desktop_release_channel_idx` ON `desktop_release` (`channel`);--> statement-breakpoint
CREATE INDEX `desktop_release_status_idx` ON `desktop_release` (`status`);--> statement-breakpoint
CREATE INDEX `desktop_artifact_release_idx` ON `desktop_release_artifact` (`desktop_release_id`);--> statement-breakpoint
CREATE INDEX `desktop_artifact_platform_arch_idx` ON `desktop_release_artifact` (`platform`,`architecture`);--> statement-breakpoint
CREATE INDEX `desktop_update_event_installation_idx` ON `desktop_update_event` (`desktop_installation_id`);--> statement-breakpoint
CREATE INDEX `desktop_update_event_release_idx` ON `desktop_update_event` (`desktop_release_id`);
