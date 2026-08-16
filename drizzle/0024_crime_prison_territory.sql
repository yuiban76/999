ALTER TABLE `players` ADD COLUMN `prison_until` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `prison_crime` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `territory_location` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `territory_day` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `territory_payout_day` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `territory_visits` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `territory_income` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `territory_pending` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `hack_day` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `hack_uses` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `territory_visit_log` (
	`owner_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`cycle_day` integer NOT NULL,
	`last_visit_minute` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `visitor_id`, `cycle_day`)
);
--> statement-breakpoint
CREATE INDEX `idx_territory_visit_owner_day` ON `territory_visit_log` (`owner_id`,`cycle_day`);
--> statement-breakpoint
UPDATE `players`
SET `current_job` = 'unemployed', `job_category` = 'unfixed', `job_exp` = 0
WHERE `current_job` IN ('職業球員', '賽車手', '格鬥選手', '教練', '裁判', '健身教練');
