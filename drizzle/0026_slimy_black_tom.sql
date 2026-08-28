CREATE TABLE `city_coop_contributions` (
	`cycle_day` integer NOT NULL,
	`role` text NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`job_category` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`contributed_at` integer NOT NULL,
	PRIMARY KEY(`cycle_day`, `role`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_coop_user_day` ON `city_coop_contributions` (`cycle_day`,`user_id`);--> statement-breakpoint
CREATE TABLE `city_coop_projects` (
	`cycle_day` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` integer,
	`completion_token` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `player_inventory` (
	`user_id` text NOT NULL,
	`item_key` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `item_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_user_life` ON `player_inventory` (`user_id`,`life_version`);--> statement-breakpoint
CREATE TABLE `street_aid_boxes` (
	`owner_id` text NOT NULL,
	`cycle_day` integer NOT NULL,
	`owner_name` text NOT NULL,
	`owner_life_version` integer DEFAULT 0 NOT NULL,
	`total_received` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `cycle_day`)
);
--> statement-breakpoint
CREATE INDEX `idx_aid_boxes_day_status` ON `street_aid_boxes` (`cycle_day`,`status`);--> statement-breakpoint
CREATE TABLE `street_aid_donations` (
	`owner_id` text NOT NULL,
	`cycle_day` integer NOT NULL,
	`donor_id` text NOT NULL,
	`amount` integer NOT NULL,
	`action_token` text DEFAULT '' NOT NULL,
	`donated_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `cycle_day`, `donor_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_aid_donations_donor_day` ON `street_aid_donations` (`donor_id`,`cycle_day`);--> statement-breakpoint
CREATE TABLE `street_beg_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`requester_name` text NOT NULL,
	`recipient_id` text NOT NULL,
	`requester_job` text NOT NULL,
	`requester_life_version` integer DEFAULT 0 NOT NULL,
	`recipient_life_version` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`resolution_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_beg_recipient_status` ON `street_beg_requests` (`recipient_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_beg_pair_created` ON `street_beg_requests` (`requester_id`,`recipient_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `player_progress` ADD `story_seen_chapter` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `street_day` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `street_scavenges` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `street_beg_income` integer DEFAULT 0 NOT NULL;