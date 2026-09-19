CREATE TABLE `ai_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dish_recommendations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dish` text NOT NULL,
	`normalized_dish` text NOT NULL,
	`recommendations` text NOT NULL,
	`cellar_fingerprint` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tastings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wine_id` integer NOT NULL,
	`tasted_on` text NOT NULL,
	`star_rating` integer,
	`tasting_note` text,
	`occasion_or_dish` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wine_id`) REFERENCES `wines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producer` text,
	`name` text,
	`vintage` integer,
	`country` text,
	`region` text,
	`appellation` text,
	`grape_varieties` text NOT NULL,
	`wine_type` text,
	`alcohol_percent` real,
	`bottle_count` integer DEFAULT 0 NOT NULL,
	`storage_location` text,
	`purchase_price_per_bottle` real,
	`photo_file_name` text NOT NULL,
	`style_classification` text,
	`description` text,
	`critic_scores` text NOT NULL,
	`aggregate_score` integer,
	`drink_from_year` integer,
	`drink_until_year` integer,
	`food_pairings` text NOT NULL,
	`estimated_market_value` real,
	`confidence` text,
	`analyzed_at` integer,
	`analysis_status` text DEFAULT 'pending' NOT NULL,
	`analysis_error` text,
	`duplicate_of_wine_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
