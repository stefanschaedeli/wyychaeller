CREATE TABLE `bottle_placements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`location_id` integer,
	`row_index` integer,
	`slot_index` integer,
	`free_text` text,
	`bottle_count` integer NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `storage_locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `bottle_placements_wine_id_idx` ON `bottle_placements` (`wine_id`);--> statement-breakpoint
CREATE INDEX `bottle_placements_location_id_idx` ON `bottle_placements` (`location_id`);--> statement-breakpoint
CREATE TABLE `storage_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`row_count` integer,
	`slots_per_row` integer,
	`slot_label_style` text,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO bottle_placements (wine_id, location_id, row_index, slot_index, free_text, bottle_count) SELECT id, NULL, NULL, NULL, storage_location, bottle_count FROM wines WHERE bottle_count > 0;
