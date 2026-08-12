CREATE TABLE `casino_hands` (
	`user_id` text PRIMARY KEY NOT NULL,
	`player_name` text NOT NULL,
	`player_cards` text DEFAULT '[]' NOT NULL,
	`dealer_cards` text DEFAULT '[]' NOT NULL,
	`bet` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`result` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_casino_status_updated` ON `casino_hands` (`status`,`updated_at`);
--> statement-breakpoint
UPDATE `players` SET `location` = 'casino' WHERE `location` = 'park';
