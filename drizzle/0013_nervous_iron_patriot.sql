CREATE TABLE `casino_table_state` (
	`id` text PRIMARY KEY NOT NULL,
	`deck` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `poker_table_state` (
	`id` text PRIMARY KEY NOT NULL,
	`deck` text DEFAULT '[]' NOT NULL,
	`community_cards` text DEFAULT '[]' NOT NULL,
	`street` text DEFAULT 'idle' NOT NULL,
	`current_bet` integer DEFAULT 0 NOT NULL,
	`turn_seat` integer DEFAULT 0 NOT NULL,
	`pot` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `poker_hands` ADD `street_bet` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `poker_hands` ADD `acted` integer DEFAULT false NOT NULL;