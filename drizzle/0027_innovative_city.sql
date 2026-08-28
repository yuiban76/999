CREATE TABLE `city_commission_claims` (
	`user_id` text NOT NULL,
	`cycle_day` integer NOT NULL,
	`commission_id` text NOT NULL,
	`life_version` integer DEFAULT 0 NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `cycle_day`, `commission_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_commission_claim_day` ON `city_commission_claims` (`cycle_day`,`commission_id`);--> statement-breakpoint
CREATE TABLE `life_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`creator_name` text NOT NULL,
	`creator_life_version` integer DEFAULT 0 NOT NULL,
	`partner_id` text NOT NULL,
	`partner_name` text NOT NULL,
	`partner_life_version` integer DEFAULT 0 NOT NULL,
	`target_per_player` integer DEFAULT 1000 NOT NULL,
	`stake` integer DEFAULT 200 NOT NULL,
	`creator_deposit` integer DEFAULT 0 NOT NULL,
	`partner_deposit` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_day` integer NOT NULL,
	`resolution_token` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contract_member_status` ON `life_contracts` (`creator_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_contract_partner_status` ON `life_contracts` (`partner_id`,`status`);--> statement-breakpoint
CREATE TABLE `player_reputation` (
	`user_id` text NOT NULL,
	`faction` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `faction`)
);
--> statement-breakpoint
CREATE INDEX `idx_reputation_user_points` ON `player_reputation` (`user_id`,`points`);