CREATE TABLE `reviewHelpfulVotes` (
	`id` varchar(64) NOT NULL,
	`ratingId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `reviewHelpfulVotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `templateRatings` ADD `templateType` varchar(20) DEFAULT 'builtin' NOT NULL;--> statement-breakpoint
ALTER TABLE `templateRatings` ADD `userName` varchar(255);--> statement-breakpoint
ALTER TABLE `templateRatings` ADD `helpful` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `templateRatings` ADD `updatedAt` timestamp DEFAULT (now());--> statement-breakpoint
CREATE INDEX `ratingId_idx` ON `reviewHelpfulVotes` (`ratingId`);