CREATE TABLE `city_memory_contributions` (
	`user_id` text NOT NULL,
	`cycle_day` integer NOT NULL,
	`work_count` integer DEFAULT 0 NOT NULL,
	`hospital_count` integer DEFAULT 0 NOT NULL,
	`housing_count` integer DEFAULT 0 NOT NULL,
	`casino_count` integer DEFAULT 0 NOT NULL,
	`study_count` integer DEFAULT 0 NOT NULL,
	`event_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `cycle_day`)
);
--> statement-breakpoint
CREATE INDEX `idx_city_memory_cycle` ON `city_memory_contributions` (`cycle_day`);--> statement-breakpoint
CREATE TABLE `mystery_clues` (
	`user_id` text NOT NULL,
	`clue_key` text NOT NULL,
	`found_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `clue_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_mystery_clues_key` ON `mystery_clues` (`clue_key`);--> statement-breakpoint
CREATE TABLE `player_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`talent_exp` integer DEFAULT 0 NOT NULL,
	`talents` text DEFAULT '[]' NOT NULL,
	`story_chapter` integer DEFAULT 0 NOT NULL,
	`last_event_day` integer DEFAULT 0 NOT NULL,
	`pending_event` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
