CREATE TABLE `player_loan_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`borrower_id` text NOT NULL,
	`borrower_name` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_name` text NOT NULL,
	`provider_job` text NOT NULL,
	`principal_amount` integer NOT NULL,
	`outstanding_balance` integer NOT NULL,
	`interest_rate_bp` integer NOT NULL,
	`spread_bp` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_loan_contracts_borrower_status` ON `player_loan_contracts` (`borrower_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_loan_contracts_provider_status` ON `player_loan_contracts` (`provider_id`,`status`);--> statement-breakpoint
CREATE TABLE `player_loan_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`borrower_id` text NOT NULL,
	`borrower_name` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_name` text NOT NULL,
	`provider_job` text NOT NULL,
	`amount` integer NOT NULL,
	`interest_rate_bp` integer NOT NULL,
	`spread_bp` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`outcome` text DEFAULT '' NOT NULL,
	`resolution_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_loan_requests_provider_status` ON `player_loan_requests` (`provider_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_loan_requests_borrower_status` ON `player_loan_requests` (`borrower_id`,`status`,`expires_at`);