CREATE TABLE `camera_deploy_session` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`site_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','planned','deploying','completed','cancelled') NOT NULL DEFAULT 'draft',
	`ip_range_start` varchar(64),
	`ip_range_end` varchar(64),
	`subnet_mask` varchar(64),
	`gateway` varchar(64),
	`dns_servers` varchar(255),
	`default_username` varchar(128),
	`encrypted_default_password` text,
	`vlan_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `camera_deploy_session_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `camera_deploy_target` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`session_id` varchar(36) NOT NULL,
	`device_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`location_label` varchar(255),
	`manufacturer` varchar(255),
	`model` varchar(255),
	`mac_address` varchar(64),
	`serial_number` varchar(128),
	`current_ip` varchar(64),
	`target_ip` varchar(64),
	`username` varchar(128),
	`encrypted_password` text,
	`channel_number` int,
	`status` enum('pending','configured','deployed','failed','skipped') NOT NULL DEFAULT 'pending',
	`sort_order` int NOT NULL DEFAULT 0,
	`error_message` text,
	`deployed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `camera_deploy_target_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `camera_deploy_session` ADD CONSTRAINT `camera_deploy_session_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `camera_deploy_session` ADD CONSTRAINT `camera_deploy_session_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `camera_deploy_session` ADD CONSTRAINT `camera_deploy_session_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `camera_deploy_target` ADD CONSTRAINT `camera_deploy_target_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `camera_deploy_target` ADD CONSTRAINT `camera_deploy_target_session_id_camera_deploy_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `camera_deploy_session`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `camera_deploy_target` ADD CONSTRAINT `camera_deploy_target_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `camera_deploy_session_org_idx` ON `camera_deploy_session` (`organization_id`);--> statement-breakpoint
CREATE INDEX `camera_deploy_session_site_idx` ON `camera_deploy_session` (`site_id`);--> statement-breakpoint
CREATE INDEX `camera_deploy_target_org_idx` ON `camera_deploy_target` (`organization_id`);--> statement-breakpoint
CREATE INDEX `camera_deploy_target_session_idx` ON `camera_deploy_target` (`session_id`);--> statement-breakpoint
CREATE INDEX `camera_deploy_target_device_idx` ON `camera_deploy_target` (`device_id`);