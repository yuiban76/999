ALTER TABLE `players` ADD `action_available_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `action_label` text DEFAULT '' NOT NULL;