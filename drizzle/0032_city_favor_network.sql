CREATE TABLE `player_npc_favors` (
	`user_id` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`play_day` integer NOT NULL,
	`npc_id` text NOT NULL,
	`benefit_key` text NOT NULL,
	`relation_cost` integer NOT NULL,
	`action_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `life_version`, `play_day`)
);
--> statement-breakpoint
CREATE INDEX `idx_npc_favors_user_created` ON `player_npc_favors` (`user_id`,`created_at`);
