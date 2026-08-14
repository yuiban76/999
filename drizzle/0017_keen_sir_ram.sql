CREATE TABLE `casino_bingo_entries` (
	`round_no` integer NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`card` text NOT NULL,
	PRIMARY KEY(`round_no`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_bingo_entries_round` ON `casino_bingo_entries` (`round_no`);--> statement-breakpoint
CREATE TABLE `casino_bingo_state` (
	`id` text PRIMARY KEY NOT NULL,
	`round_no` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`drawn_numbers` text DEFAULT '[]' NOT NULL,
	`next_draw_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `casino_tournament_entries` (
	`tournament_no` integer NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`latest_hand` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`tournament_no`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_tournament_entries_round` ON `casino_tournament_entries` (`tournament_no`);--> statement-breakpoint
CREATE TABLE `casino_tournament_state` (
	`id` text PRIMARY KEY NOT NULL,
	`round_no` integer DEFAULT 1 NOT NULL,
	`current_round` integer DEFAULT 0 NOT NULL,
	`game` text DEFAULT 'blackjack' NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`round_limit` integer DEFAULT 3 NOT NULL,
	`next_round_at` integer DEFAULT 0 NOT NULL,
	`latest_result` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
