-- Custom SQL migration file, put your code below! --
ALTER TABLE `players` ADD COLUMN `owns_restaurant` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `players`
SET `current_job` = '廚房助理', `job_category` = 'hospitality', `job_exp` = 0
WHERE `current_job` IN ('咖啡師', '調酒師', '旅館經理', '導遊');
