CREATE TABLE `cctv_project` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`site_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`retention_days` int NOT NULL DEFAULT 30,
	`reserve_percent` double NOT NULL DEFAULT 20,
	`raid_factor` double NOT NULL DEFAULT 1.33,
	`spare_capacity_tb` double NOT NULL DEFAULT 0,
	`use_binary_tb` boolean NOT NULL DEFAULT true,
	`growth_percent` double NOT NULL DEFAULT 0,
	`disk_size_tb` double NOT NULL DEFAULT 8,
	`clients_count` int NOT NULL DEFAULT 2,
	`client_bitrate_mbps` double NOT NULL DEFAULT 8,
	`max_recorder_bandwidth_mbps` double NOT NULL DEFAULT 256,
	`max_ports_per_recorder` int NOT NULL DEFAULT 32,
	`poe_budget_watts` double NOT NULL DEFAULT 370,
	`watts_per_camera` double NOT NULL DEFAULT 8,
	`ups_capacity_wh` double NOT NULL DEFAULT 1000,
	`system_load_watts` double NOT NULL DEFAULT 250,
	`groups_json` text NOT NULL,
	`result_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `cctv_project_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cctv_scenario` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`retention_days` int NOT NULL,
	`reserve_percent` double NOT NULL,
	`notes` text,
	`result_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cctv_scenario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cctv_project` ADD CONSTRAINT `cctv_project_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cctv_project` ADD CONSTRAINT `cctv_project_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cctv_project` ADD CONSTRAINT `cctv_project_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cctv_scenario` ADD CONSTRAINT `cctv_scenario_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cctv_scenario` ADD CONSTRAINT `cctv_scenario_project_id_cctv_project_id_fk` FOREIGN KEY (`project_id`) REFERENCES `cctv_project`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cctv_project_org_idx` ON `cctv_project` (`organization_id`);--> statement-breakpoint
CREATE INDEX `cctv_project_customer_idx` ON `cctv_project` (`customer_id`);--> statement-breakpoint
CREATE INDEX `cctv_scenario_org_idx` ON `cctv_scenario` (`organization_id`);--> statement-breakpoint
CREATE INDEX `cctv_scenario_project_idx` ON `cctv_scenario` (`project_id`);