ALTER TABLE `casino_hands` ADD `seat_no` integer;--> statement-breakpoint
ALTER TABLE `casino_hands` ADD `reveal_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_casino_seat` ON `casino_hands` (`seat_no`);