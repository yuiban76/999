CREATE TABLE `game_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`room_id` text DEFAULT 'lobby-01' NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`tone` text DEFAULT 'neutral' NOT NULL,
	`game_time` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_room_created` ON `game_events` (`room_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `players` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`cash` integer DEFAULT 10000 NOT NULL,
	`energy` integer DEFAULT 100 NOT NULL,
	`health` integer DEFAULT 100 NOT NULL,
	`mood` integer DEFAULT 80 NOT NULL,
	`hunger` integer DEFAULT 80 NOT NULL,
	`intelligence_exp` integer DEFAULT 0 NOT NULL,
	`programming_exp` integer DEFAULT 0 NOT NULL,
	`fitness_exp` integer DEFAULT 0 NOT NULL,
	`work_exp` integer DEFAULT 0 NOT NULL,
	`elapsed_minutes` integer DEFAULT 450 NOT NULL,
	`location` text DEFAULT 'home' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_players_last_seen` ON `players` (`last_seen_at`);