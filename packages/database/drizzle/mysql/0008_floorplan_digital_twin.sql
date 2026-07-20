CREATE TABLE `floor_plan` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`site_id` varchar(36) NOT NULL,
	`building_id` varchar(36),
	`floor_id` varchar(36),
	`room_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`description` text,
	`image_storage_key` varchar(512),
	`image_mime_type` varchar(128),
	`pdf_storage_key` varchar(512),
	`original_width` int,
	`original_height` int,
	`scale_enabled` boolean NOT NULL DEFAULT false,
	`scale_value` double,
	`scale_unit` varchar(8),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`created_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `floor_plan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_connection` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`floor_plan_id` varchar(36) NOT NULL,
	`source_element_id` varchar(36) NOT NULL,
	`target_element_id` varchar(36) NOT NULL,
	`connection_type` varchar(64) NOT NULL DEFAULT 'network',
	`label` varchar(255),
	`path_data` text,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `floor_plan_connection_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_element` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`floor_plan_id` varchar(36) NOT NULL,
	`layer_id` varchar(36) NOT NULL,
	`element_type` varchar(64) NOT NULL,
	`device_id` varchar(36),
	`switch_id` varchar(36),
	`switch_port_id` varchar(36),
	`room_id` varchar(36),
	`label` varchar(255),
	`description` text,
	`x` double NOT NULL DEFAULT 0,
	`y` double NOT NULL DEFAULT 0,
	`width` double NOT NULL DEFAULT 32,
	`height` double NOT NULL DEFAULT 32,
	`rotation` double NOT NULL DEFAULT 0,
	`z_index` int NOT NULL DEFAULT 0,
	`icon` varchar(64),
	`shape` varchar(32),
	`status_override` varchar(32),
	`metadata` text,
	`is_locked` boolean NOT NULL DEFAULT false,
	`created_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `floor_plan_element_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_layer` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`floor_plan_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(64) NOT NULL,
	`is_visible` boolean NOT NULL DEFAULT true,
	`is_locked` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `floor_plan_layer_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_version` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`floor_plan_id` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`description` varchar(500),
	`snapshot_json` text,
	`created_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `floor_plan_version_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `floor_plan_zone` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`floor_plan_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`zone_type` varchar(64) NOT NULL DEFAULT 'custom',
	`points` text NOT NULL,
	`label` varchar(255),
	`description` text,
	`opacity` double NOT NULL DEFAULT 0.25,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `floor_plan_zone_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_category` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`parent_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_item` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`barcode` varchar(128),
	`name` varchar(255) NOT NULL,
	`description` text,
	`category_id` varchar(36),
	`manufacturer_id` varchar(36),
	`unit` varchar(32) NOT NULL DEFAULT 'kos',
	`item_type` varchar(64) NOT NULL DEFAULT 'sparePart',
	`is_serialized` boolean NOT NULL DEFAULT false,
	`is_lot_tracked` boolean NOT NULL DEFAULT false,
	`minimum_stock` double NOT NULL DEFAULT 0,
	`recommended_stock` double NOT NULL DEFAULT 0,
	`purchase_price` double,
	`selling_price` double,
	`tax_rate` double,
	`currency` varchar(8) NOT NULL DEFAULT 'EUR',
	`warranty_months` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `inventory_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_location` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location_type` varchar(64) NOT NULL DEFAULT 'warehouse',
	`parent_id` varchar(36),
	`site_id` varchar(36),
	`assigned_user_id` varchar(36),
	`address` varchar(500),
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_location_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movement` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36) NOT NULL,
	`inventory_serial_id` varchar(36),
	`movement_type` varchar(64) NOT NULL,
	`source_location_id` varchar(36),
	`destination_location_id` varchar(36),
	`quantity` double NOT NULL,
	`unit_cost` double,
	`reference_type` varchar(64),
	`reference_id` varchar(36),
	`reason` varchar(255),
	`notes` text,
	`performed_by_id` varchar(36),
	`approved_by_id` varchar(36),
	`idempotency_key` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movement_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_movement_org_idempotency_uidx` UNIQUE(`organization_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `inventory_reservation` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36) NOT NULL,
	`inventory_serial_id` varchar(36),
	`location_id` varchar(36) NOT NULL,
	`quantity` double NOT NULL,
	`reservation_type` varchar(64) NOT NULL DEFAULT 'general',
	`project_id` varchar(36),
	`work_order_id` varchar(36),
	`customer_id` varchar(36),
	`site_id` varchar(36),
	`reserved_for_user_id` varchar(36),
	`status` varchar(64) NOT NULL DEFAULT 'active',
	`expires_at` timestamp,
	`notes` text,
	`created_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_reservation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_serial` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36) NOT NULL,
	`serial_number` varchar(128) NOT NULL,
	`mac_address` varchar(64),
	`imei` varchar(32),
	`encrypted_license_key` text,
	`status` varchar(64) NOT NULL DEFAULT 'inStock',
	`current_location_id` varchar(36),
	`device_id` varchar(36),
	`customer_id` varchar(36),
	`site_id` varchar(36),
	`purchase_order_item_id` varchar(36),
	`received_at` timestamp,
	`installed_at` timestamp,
	`warranty_until` timestamp,
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_serial_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_serial_org_number_uidx` UNIQUE(`organization_id`,`serial_number`)
);
--> statement-breakpoint
CREATE TABLE `inventory_stock` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36) NOT NULL,
	`inventory_location_id` varchar(36) NOT NULL,
	`quantity` double NOT NULL DEFAULT 0,
	`reserved_quantity` double NOT NULL DEFAULT 0,
	`average_cost` double NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`version` int NOT NULL DEFAULT 1,
	CONSTRAINT `inventory_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_stock_org_item_location_uidx` UNIQUE(`organization_id`,`inventory_item_id`,`inventory_location_id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`order_number` varchar(64) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`order_date` timestamp,
	`expected_date` timestamp,
	`currency` varchar(8) NOT NULL DEFAULT 'EUR',
	`subtotal` double NOT NULL DEFAULT 0,
	`tax` double NOT NULL DEFAULT 0,
	`total` double NOT NULL DEFAULT 0,
	`notes` text,
	`created_by_id` varchar(36),
	`approved_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_order_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_order_org_number_uidx` UNIQUE(`organization_id`,`order_number`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_item` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`purchase_order_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36),
	`description` varchar(500),
	`quantity_ordered` double NOT NULL DEFAULT 0,
	`quantity_received` double NOT NULL DEFAULT 0,
	`unit_price` double NOT NULL DEFAULT 0,
	`tax_rate` double,
	`total` double NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_order_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rma_case` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36),
	`inventory_serial_id` varchar(36),
	`supplier_id` varchar(36),
	`customer_id` varchar(36),
	`site_id` varchar(36),
	`device_id` varchar(36),
	`case_number` varchar(64) NOT NULL,
	`reason` varchar(255),
	`description` text,
	`status` varchar(64) NOT NULL DEFAULT 'opened',
	`sent_at` timestamp,
	`received_at` timestamp,
	`resolution` text,
	`replacement_serial_id` varchar(36),
	`created_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rma_case_id` PRIMARY KEY(`id`),
	CONSTRAINT `rma_case_org_number_uidx` UNIQUE(`organization_id`,`case_number`)
);
--> statement-breakpoint
CREATE TABLE `stocktake` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_by_id` varchar(36),
	`completed_by_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stocktake_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stocktake_item` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`stocktake_id` varchar(36) NOT NULL,
	`inventory_item_id` varchar(36) NOT NULL,
	`inventory_serial_id` varchar(36),
	`expected_quantity` double NOT NULL DEFAULT 0,
	`counted_quantity` double,
	`difference` double,
	`notes` text,
	`counted_by_id` varchar(36),
	`counted_at` timestamp,
	CONSTRAINT `stocktake_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` varchar(36) NOT NULL,
	`organization_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`tax_number` varchar(64),
	`address` varchar(500),
	`email` varchar(255),
	`phone` varchar(64),
	`contact_person` varchar(255),
	`website` varchar(255),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_building_id_building_id_fk` FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_floor_id_floor_id_fk` FOREIGN KEY (`floor_id`) REFERENCES `floor`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_room_id_room_id_fk` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan` ADD CONSTRAINT `floor_plan_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_connection` ADD CONSTRAINT `floor_plan_connection_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_connection` ADD CONSTRAINT `floor_plan_connection_floor_plan_id_floor_plan_id_fk` FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plan`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_connection` ADD CONSTRAINT `floor_plan_connection_source_element_id_floor_plan_element_id_fk` FOREIGN KEY (`source_element_id`) REFERENCES `floor_plan_element`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_connection` ADD CONSTRAINT `floor_plan_connection_target_element_id_floor_plan_element_id_fk` FOREIGN KEY (`target_element_id`) REFERENCES `floor_plan_element`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_floor_plan_id_floor_plan_id_fk` FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plan`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_layer_id_floor_plan_layer_id_fk` FOREIGN KEY (`layer_id`) REFERENCES `floor_plan_layer`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_switch_id_network_switch_id_fk` FOREIGN KEY (`switch_id`) REFERENCES `network_switch`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_switch_port_id_network_port_id_fk` FOREIGN KEY (`switch_port_id`) REFERENCES `network_port`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_room_id_room_id_fk` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_element` ADD CONSTRAINT `floor_plan_element_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_layer` ADD CONSTRAINT `floor_plan_layer_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_layer` ADD CONSTRAINT `floor_plan_layer_floor_plan_id_floor_plan_id_fk` FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plan`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_version` ADD CONSTRAINT `floor_plan_version_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_version` ADD CONSTRAINT `floor_plan_version_floor_plan_id_floor_plan_id_fk` FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plan`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_version` ADD CONSTRAINT `floor_plan_version_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_zone` ADD CONSTRAINT `floor_plan_zone_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `floor_plan_zone` ADD CONSTRAINT `floor_plan_zone_floor_plan_id_floor_plan_id_fk` FOREIGN KEY (`floor_plan_id`) REFERENCES `floor_plan`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_category` ADD CONSTRAINT `inventory_category_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_category` ADD CONSTRAINT `inventory_category_parent_id_inventory_category_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `inventory_category`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_item` ADD CONSTRAINT `inventory_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_item` ADD CONSTRAINT `inventory_item_category_id_inventory_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `inventory_category`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_item` ADD CONSTRAINT `inventory_item_manufacturer_id_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_location` ADD CONSTRAINT `inventory_location_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_location` ADD CONSTRAINT `inventory_location_parent_id_inventory_location_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `inventory_location`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_location` ADD CONSTRAINT `inventory_location_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_location` ADD CONSTRAINT `inventory_location_assigned_user_id_user_id_fk` FOREIGN KEY (`assigned_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_inventory_serial_id_inventory_serial_id_fk` FOREIGN KEY (`inventory_serial_id`) REFERENCES `inventory_serial`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_source_location_id_inventory_location_id_fk` FOREIGN KEY (`source_location_id`) REFERENCES `inventory_location`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inv_move_dest_location_fk` FOREIGN KEY (`destination_location_id`) REFERENCES `inventory_location`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_performed_by_id_user_id_fk` FOREIGN KEY (`performed_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movement` ADD CONSTRAINT `inventory_movement_approved_by_id_user_id_fk` FOREIGN KEY (`approved_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_inventory_serial_id_inventory_serial_id_fk` FOREIGN KEY (`inventory_serial_id`) REFERENCES `inventory_serial`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_location_id_inventory_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_location`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_reserved_for_user_id_user_id_fk` FOREIGN KEY (`reserved_for_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_reservation` ADD CONSTRAINT `inventory_reservation_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_serial` ADD CONSTRAINT `inventory_serial_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_serial` ADD CONSTRAINT `inventory_serial_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_serial` ADD CONSTRAINT `inventory_serial_current_location_id_inventory_location_id_fk` FOREIGN KEY (`current_location_id`) REFERENCES `inventory_location`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_serial` ADD CONSTRAINT `inventory_serial_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_serial` ADD CONSTRAINT `inventory_serial_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_serial` ADD CONSTRAINT `inventory_serial_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stock` ADD CONSTRAINT `inventory_stock_inventory_location_id_inventory_location_id_fk` FOREIGN KEY (`inventory_location_id`) REFERENCES `inventory_location`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_approved_by_id_user_id_fk` FOREIGN KEY (`approved_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_item` ADD CONSTRAINT `purchase_order_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_item` ADD CONSTRAINT `purchase_order_item_purchase_order_id_purchase_order_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_item` ADD CONSTRAINT `purchase_order_item_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_inventory_serial_id_inventory_serial_id_fk` FOREIGN KEY (`inventory_serial_id`) REFERENCES `inventory_serial`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_supplier_id_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_customer_id_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_site_id_site_id_fk` FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_replacement_serial_id_inventory_serial_id_fk` FOREIGN KEY (`replacement_serial_id`) REFERENCES `inventory_serial`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rma_case` ADD CONSTRAINT `rma_case_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake` ADD CONSTRAINT `stocktake_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake` ADD CONSTRAINT `stocktake_location_id_inventory_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_location`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake` ADD CONSTRAINT `stocktake_created_by_id_user_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake` ADD CONSTRAINT `stocktake_completed_by_id_user_id_fk` FOREIGN KEY (`completed_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake_item` ADD CONSTRAINT `stocktake_item_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake_item` ADD CONSTRAINT `stocktake_item_stocktake_id_stocktake_id_fk` FOREIGN KEY (`stocktake_id`) REFERENCES `stocktake`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake_item` ADD CONSTRAINT `stocktake_item_inventory_item_id_inventory_item_id_fk` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake_item` ADD CONSTRAINT `stocktake_item_inventory_serial_id_inventory_serial_id_fk` FOREIGN KEY (`inventory_serial_id`) REFERENCES `inventory_serial`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stocktake_item` ADD CONSTRAINT `stocktake_item_counted_by_id_user_id_fk` FOREIGN KEY (`counted_by_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `floor_plan_org_idx` ON `floor_plan` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_site_idx` ON `floor_plan` (`site_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_customer_idx` ON `floor_plan` (`customer_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_connection_org_idx` ON `floor_plan_connection` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_connection_plan_idx` ON `floor_plan_connection` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_element_org_idx` ON `floor_plan_element` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_element_plan_idx` ON `floor_plan_element` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_element_device_idx` ON `floor_plan_element` (`device_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_layer_org_idx` ON `floor_plan_layer` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_layer_plan_idx` ON `floor_plan_layer` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_version_org_idx` ON `floor_plan_version` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_version_plan_idx` ON `floor_plan_version` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_zone_org_idx` ON `floor_plan_zone` (`organization_id`);--> statement-breakpoint
CREATE INDEX `floor_plan_zone_plan_idx` ON `floor_plan_zone` (`floor_plan_id`);--> statement-breakpoint
CREATE INDEX `inventory_category_org_idx` ON `inventory_category` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_category_parent_idx` ON `inventory_category` (`parent_id`);--> statement-breakpoint
CREATE INDEX `inventory_item_org_idx` ON `inventory_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_item_category_idx` ON `inventory_item` (`category_id`);--> statement-breakpoint
CREATE INDEX `inventory_item_sku_idx` ON `inventory_item` (`organization_id`,`sku`);--> statement-breakpoint
CREATE INDEX `inventory_location_org_idx` ON `inventory_location` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_location_parent_idx` ON `inventory_location` (`parent_id`);--> statement-breakpoint
CREATE INDEX `inventory_location_site_idx` ON `inventory_location` (`site_id`);--> statement-breakpoint
CREATE INDEX `inventory_movement_org_idx` ON `inventory_movement` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_movement_item_idx` ON `inventory_movement` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `inventory_movement_serial_idx` ON `inventory_movement` (`inventory_serial_id`);--> statement-breakpoint
CREATE INDEX `inventory_reservation_org_idx` ON `inventory_reservation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_reservation_item_idx` ON `inventory_reservation` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `inventory_reservation_location_idx` ON `inventory_reservation` (`location_id`);--> statement-breakpoint
CREATE INDEX `inventory_serial_org_idx` ON `inventory_serial` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_serial_item_idx` ON `inventory_serial` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `inventory_serial_location_idx` ON `inventory_serial` (`current_location_id`);--> statement-breakpoint
CREATE INDEX `inventory_stock_org_idx` ON `inventory_stock` (`organization_id`);--> statement-breakpoint
CREATE INDEX `inventory_stock_item_idx` ON `inventory_stock` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `inventory_stock_location_idx` ON `inventory_stock` (`inventory_location_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_org_idx` ON `purchase_order` (`organization_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_supplier_idx` ON `purchase_order` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_item_org_idx` ON `purchase_order_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_item_po_idx` ON `purchase_order_item` (`purchase_order_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_item_item_idx` ON `purchase_order_item` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `rma_case_org_idx` ON `rma_case` (`organization_id`);--> statement-breakpoint
CREATE INDEX `rma_case_serial_idx` ON `rma_case` (`inventory_serial_id`);--> statement-breakpoint
CREATE INDEX `stocktake_org_idx` ON `stocktake` (`organization_id`);--> statement-breakpoint
CREATE INDEX `stocktake_location_idx` ON `stocktake` (`location_id`);--> statement-breakpoint
CREATE INDEX `stocktake_item_org_idx` ON `stocktake_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `stocktake_item_stocktake_idx` ON `stocktake_item` (`stocktake_id`);--> statement-breakpoint
CREATE INDEX `stocktake_item_item_idx` ON `stocktake_item` (`inventory_item_id`);--> statement-breakpoint
CREATE INDEX `supplier_org_idx` ON `supplier` (`organization_id`);