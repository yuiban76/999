ALTER TABLE `players` ADD `daily_minimum_payment` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `daily_payment_made` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `missed_payment_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `game_over` text DEFAULT '' NOT NULL;