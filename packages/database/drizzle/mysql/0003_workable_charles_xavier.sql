CREATE TABLE `network_ip_assignment` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`site_id` varchar(36),
	`vlan_id` int,
	`ip_address` varchar(64) NOT NULL,
	`hostname` varchar(255),
	`device_id` varchar(36),
	`mac_address` varchar(64),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `network_ip_assignment_id` PRIMARY KEY(`id`),
	CONSTRAINT `network_ip_org_ip_uidx` UNIQUE(`organization_id`,`ip_address`,`site_id`)
);
--> statement-breakpoint
CREATE TABLE `network_port` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`switch_id` varchar(36) NOT NULL,
	`port_number` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` text,
	`status` enum('up','down','disabled','error','unknown') NOT NULL DEFAULT 'unknown',
	`role` enum('access','trunk','uplink','unused') NOT NULL DEFAULT 'unused',
	`speed_mbps` int,
	`duplex` varchar(16),
	`poe_state` enum('off','on','fault','denied','unknown') NOT NULL DEFAULT 'unknown',
	`poe_watts` double NOT NULL DEFAULT 0,
	`access_vlan` int,
	`tagged_vlans` text,
	`connected_device_id` varchar(36),
	`connected_device_label` varchar(255),
	`last_changed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `network_port_id` PRIMARY KEY(`id`),
	CONSTRAINT `network_port_switch_number_uidx` UNIQUE(`switch_id`,`port_number`)
);
--> statement-breakpoint
CREATE TABLE `network_switch` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`site_id` varchar(36),
	`device_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`manufacturer` varchar(255),
	`model` varchar(255),
	`ip_address` varchar(64),
	`mac_address` varchar(64),
	`serial_number` varchar(128),
	`port_count` int NOT NULL DEFAULT 24,
	`poe_budget_watts` double NOT NULL DEFAULT 0,
	`location` varchar(255),
	`rack` varchar(128),
	`u_position` varchar(32),
	`firmware` varchar(128),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `network_switch_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `network_vlan` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`site_id` varchar(36),
	`vlan_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`subnet_cidr` varchar(64),
	`gateway` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `network_vlan_id` PRIMARY KEY(`id`),
	CONSTRAINT `network_vlan_org_vlan_uidx` UNIQUE(`organization_id`,`vlan_id`,`site_id`)
);
--> statement-breakpoint
ALTER TABLE `network_ip_assignment` ADD CONSTRAINT `network_ip_assignment_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_ip_assignment` ADD CONSTRAINT `network_ip_assignment_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_ip_assignment` ADD CONSTRAINT `network_ip_assignment_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_port` ADD CONSTRAINT `network_port_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_port` ADD CONSTRAINT `network_port_switch_id_network_switch_id_fk` FOREIGN KEY (`switch_id`) REFERENCES `network_switch`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_port` ADD CONSTRAINT `network_port_connected_device_id_device_id_fk` FOREIGN KEY (`connected_device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_switch` ADD CONSTRAINT `network_switch_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_switch` ADD CONSTRAINT `network_switch_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_switch` ADD CONSTRAINT `network_switch_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_switch` ADD CONSTRAINT `network_switch_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_vlan` ADD CONSTRAINT `network_vlan_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `network_vlan` ADD CONSTRAINT `network_vlan_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `network_ip_org_idx` ON `network_ip_assignment` (`organization_id`);--> statement-breakpoint
CREATE INDEX `network_ip_site_idx` ON `network_ip_assignment` (`site_id`);--> statement-breakpoint
CREATE INDEX `network_port_org_idx` ON `network_port` (`organization_id`);--> statement-breakpoint
CREATE INDEX `network_port_switch_idx` ON `network_port` (`switch_id`);--> statement-breakpoint
CREATE INDEX `network_switch_org_idx` ON `network_switch` (`organization_id`);--> statement-breakpoint
CREATE INDEX `network_switch_site_idx` ON `network_switch` (`site_id`);--> statement-breakpoint
CREATE INDEX `network_vlan_org_idx` ON `network_vlan` (`organization_id`);