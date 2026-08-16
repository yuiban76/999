ALTER TABLE `players` ADD COLUMN `writer_fans` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `writer_day` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` ADD COLUMN `writer_writes` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `players` DROP COLUMN `mood`;
--> statement-breakpoint
UPDATE `players` SET `current_job`='寫作助理', `job_category`='literary', `job_exp`=0 WHERE `job_category`='creative' OR `current_job` IN ('作家','畫家','設計師','演員','歌手','導演','實況主','網紅');
--> statement-breakpoint
CREATE TABLE `writer_books` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`title` text NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_writer_books_author_status` ON `writer_books` (`author_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_writer_books_status_updated` ON `writer_books` (`status`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `writer_book_purchases` (
	`book_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`author_id` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`book_id`, `buyer_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_writer_purchases_buyer` ON `writer_book_purchases` (`buyer_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_writer_purchases_author` ON `writer_book_purchases` (`author_id`,`updated_at`);
