CREATE TABLE `poker_hands` (
	`user_id` text PRIMARY KEY NOT NULL,
	`player_name` text NOT NULL,
	`hole_cards` text DEFAULT '[]' NOT NULL,
	`community_cards` text DEFAULT '[]' NOT NULL,
	`bet` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`seat_no` integer,
	`reveal_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_poker_status_updated` ON `poker_hands` (`status`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_poker_seat` ON `poker_hands` (`seat_no`);