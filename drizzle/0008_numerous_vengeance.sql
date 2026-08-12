ALTER TABLE `players` ADD `bank_balance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `loan_balance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `finance_day` integer DEFAULT 0 NOT NULL;