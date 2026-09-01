CREATE TABLE `player_life_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`plan_key` text NOT NULL,
	`start_day` integer NOT NULL,
	`end_day` integer NOT NULL,
	`career_points` integer DEFAULT 0 NOT NULL,
	`debt_repaid` integer DEFAULT 0 NOT NULL,
	`debt_target` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`effect_key` text DEFAULT '' NOT NULL,
	`effect_expires_day` integer DEFAULT 0 NOT NULL,
	`effect_consumed_at` integer,
	`reward_exp` integer DEFAULT 0 NOT NULL,
	`settlement_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_life_plans_user_life_status` ON `player_life_plans` (`user_id`,`life_version`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_life_plans_user_completed` ON `player_life_plans` (`user_id`,`completed_at`);
--> statement-breakpoint
CREATE TABLE `player_life_plan_markers` (
	`plan_id` text NOT NULL,
	`marker_type` text NOT NULL,
	`marker_key` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`plan_id`, `marker_type`, `marker_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_life_plan_markers_plan_type` ON `player_life_plan_markers` (`plan_id`,`marker_type`);
