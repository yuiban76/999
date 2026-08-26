CREATE TABLE `casino_tournament_hands` (
	`tournament_no` integer NOT NULL,
	`round_no` integer NOT NULL,
	`user_id` text NOT NULL,
	`player_name` text NOT NULL,
	`seat_no` integer NOT NULL,
	`player_cards` text DEFAULT '[]' NOT NULL,
	`hole_cards` text DEFAULT '[]' NOT NULL,
	`bet` integer DEFAULT 0 NOT NULL,
	`street_bet` integer DEFAULT 0 NOT NULL,
	`stack` integer DEFAULT 100 NOT NULL,
	`status` text DEFAULT 'playing' NOT NULL,
	`acted` integer DEFAULT false NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`action_token` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`tournament_no`, `round_no`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_tournament_hands_round` ON `casino_tournament_hands` (`tournament_no`,`round_no`,`seat_no`);--> statement-breakpoint
CREATE TABLE `casino_tournament_rounds` (
	`tournament_no` integer NOT NULL,
	`round_no` integer NOT NULL,
	`game` text DEFAULT 'blackjack' NOT NULL,
	`status` text DEFAULT 'playing' NOT NULL,
	`deck` text DEFAULT '[]' NOT NULL,
	`dealer_cards` text DEFAULT '[]' NOT NULL,
	`community_cards` text DEFAULT '[]' NOT NULL,
	`street` text DEFAULT 'idle' NOT NULL,
	`current_bet` integer DEFAULT 0 NOT NULL,
	`turn_seat` integer DEFAULT 0 NOT NULL,
	`pot` integer DEFAULT 0 NOT NULL,
	`next_action_at` integer DEFAULT 0 NOT NULL,
	`action_token` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`tournament_no`, `round_no`)
);
--> statement-breakpoint
CREATE INDEX `idx_tournament_round_status` ON `casino_tournament_rounds` (`tournament_no`,`status`);--> statement-breakpoint
CREATE TABLE `territory_visit_log` (
	`owner_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`cycle_day` integer NOT NULL,
	`last_visit_minute` integer NOT NULL,
	`action_token` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`owner_id`, `visitor_id`, `cycle_day`)
);
--> statement-breakpoint
CREATE INDEX `idx_territory_visit_owner_day` ON `territory_visit_log` (`owner_id`,`cycle_day`);--> statement-breakpoint
CREATE TABLE `writer_book_purchases` (
	`book_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`author_id` text NOT NULL,
	`buyer_life_version` integer DEFAULT 0 NOT NULL,
	`author_life_version` integer DEFAULT 0 NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`purchase_token` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`book_id`, `buyer_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_writer_purchases_buyer` ON `writer_book_purchases` (`buyer_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_writer_purchases_author` ON `writer_book_purchases` (`author_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `writer_books` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_life_version` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_writer_books_author_status` ON `writer_books` (`author_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_writer_books_status_updated` ON `writer_books` (`status`,`updated_at`);--> statement-breakpoint
ALTER TABLE `casino_bingo_entries` ADD `life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_hands` ADD `life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_hands` ADD `deal_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_table_state` ADD `round_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_table_state` ADD `action_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_tournament_entries` ADD `life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_loan_contracts` ADD `borrower_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_loan_contracts` ADD `provider_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_loan_contracts` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_loan_contracts` ADD `mutation_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_loan_requests` ADD `borrower_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_loan_requests` ADD `provider_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_medical_requests` ADD `patient_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_medical_requests` ADD `provider_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_transfer_requests` ADD `sender_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `player_transfer_requests` ADD `recipient_life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `writer_fans` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `writer_day` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `writer_writes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `owns_restaurant` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `prison_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `prison_crime` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `territory_location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `territory_day` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `territory_payout_day` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `territory_visits` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `territory_income` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `territory_pending` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `hack_day` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `hack_uses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `elapsed_remainder_ms` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `reset_game_over` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `mutation_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` DROP COLUMN `mood`;--> statement-breakpoint
ALTER TABLE `poker_hands` ADD `life_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `poker_hands` ADD `round_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `poker_hands` ADD `action_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `poker_table_state` ADD `round_token` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `poker_table_state` ADD `action_token` text DEFAULT '' NOT NULL;