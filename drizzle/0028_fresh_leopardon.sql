CREATE TABLE `casino_dice_entries` (
	`round_no` integer NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`dice` text DEFAULT '[]' NOT NULL,
	`held` text DEFAULT '[]' NOT NULL,
	`rerolls_left` integer DEFAULT 2 NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`round_no`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_dice_entries_round` ON `casino_dice_entries` (`round_no`);--> statement-breakpoint
CREATE TABLE `casino_dice_state` (
	`id` text PRIMARY KEY NOT NULL,
	`round_no` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`host_user_id` text DEFAULT '' NOT NULL,
	`entry_fee` integer DEFAULT 100 NOT NULL,
	`deadline_at` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `casino_bingo_entries` ADD `swapped` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_bingo_entries` ADD `claimed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_bingo_state` ADD `deck` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_bingo_state` ADD `preview_numbers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_bingo_state` ADD `winner_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_bingo_state` ADD `strategy_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_bingo_state` ADD `claim_until` integer DEFAULT 0 NOT NULL;