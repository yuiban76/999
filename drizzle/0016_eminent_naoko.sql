CREATE TABLE `player_transfer_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`sender_name` text NOT NULL,
	`recipient_id` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`resolution_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_transfer_requests_recipient_status` ON `player_transfer_requests` (`recipient_id`,`status`,`expires_at`);