CREATE TABLE `poker_npc_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`host_user_id` text NOT NULL,
	`host_life_version` integer DEFAULT 0 NOT NULL,
	`npc_count` integer DEFAULT 3 NOT NULL,
	`big_blind` integer DEFAULT 100 NOT NULL,
	`buy_in` integer DEFAULT 3000 NOT NULL,
	`fee_rate_bp` integer DEFAULT 300 NOT NULL,
	`state_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`next_action_at` integer DEFAULT 0 NOT NULL,
	`last_result` text DEFAULT '' NOT NULL,
	`last_payout` integer DEFAULT 0 NOT NULL,
	`last_fee` integer DEFAULT 0 NOT NULL,
	`action_token` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_poker_npc_host_status` ON `poker_npc_sessions` (`host_user_id`,`status`,`updated_at`);
