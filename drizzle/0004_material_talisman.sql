ALTER TABLE `players` ADD `owns_home` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `rental_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `rented_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `players` SET `location` = 'realtor';
