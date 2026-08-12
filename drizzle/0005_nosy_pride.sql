ALTER TABLE `players` ADD `current_job` text DEFAULT 'unemployed' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `job_category` text DEFAULT 'unfixed' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `job_exp` integer DEFAULT 0 NOT NULL;
