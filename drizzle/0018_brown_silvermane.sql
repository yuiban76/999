ALTER TABLE `casino_bingo_state` ADD `entry_fee` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `casino_tournament_state` ADD `entry_fee` integer DEFAULT 500 NOT NULL;--> statement-breakpoint
UPDATE `casino_tournament_state` SET `round_limit` = 5;
