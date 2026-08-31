CREATE TABLE `player_npc_interactions` (
	`user_id` text NOT NULL,
	`npc_id` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`play_day` integer NOT NULL,
	`event_id` text NOT NULL,
	`choice_id` text NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `npc_id`, `life_version`, `play_day`)
);
--> statement-breakpoint
CREATE INDEX `idx_npc_interaction_user_created` ON `player_npc_interactions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `player_npc_relationships` (
	`user_id` text NOT NULL,
	`npc_id` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`relation_points` integer DEFAULT 0 NOT NULL,
	`last_interaction_day` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `npc_id`, `life_version`)
);
--> statement-breakpoint
CREATE INDEX `idx_npc_relationship_user_life` ON `player_npc_relationships` (`user_id`,`life_version`);--> statement-breakpoint
CREATE TABLE `player_npc_story` (
	`user_id` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`memories` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `life_version`)
);
