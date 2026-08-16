CREATE TABLE `player_medical_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`patient_name` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_name` text NOT NULL,
	`provider_job` text NOT NULL,
	`health_gain` integer NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`resolution_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_medical_requests_provider_status` ON `player_medical_requests` (`provider_id`,`status`,`expires_at`);