ALTER TABLE `accounts` ADD `avatar_key` text;--> statement-breakpoint
ALTER TABLE `accounts` ADD `avatar_updated_at` integer;--> statement-breakpoint
ALTER TABLE `players` ADD `illness` text DEFAULT '' NOT NULL;