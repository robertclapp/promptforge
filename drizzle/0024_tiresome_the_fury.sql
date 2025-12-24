CREATE TABLE `commentNotifications` (
	`id` varchar(64) NOT NULL,
	`commentId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`type` varchar(50) NOT NULL,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `commentNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP INDEX `userId_idx` ON `activityFeed`;--> statement-breakpoint
DROP INDEX `createdAt_idx` ON `activityFeed`;--> statement-breakpoint
ALTER TABLE `comments` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `comments` ADD `userName` varchar(255);--> statement-breakpoint
ALTER TABLE `comments` ADD `userAvatar` varchar(500);--> statement-breakpoint
ALTER TABLE `comments` ADD `parentId` varchar(64);--> statement-breakpoint
ALTER TABLE `comments` ADD `rootId` varchar(64);--> statement-breakpoint
ALTER TABLE `comments` ADD `depth` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `comments` ADD `mentions` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `isEdited` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `comments` ADD `isDeleted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `comments` ADD `reactions` text;--> statement-breakpoint
CREATE INDEX `commentNotifications_userId_idx` ON `commentNotifications` (`userId`);--> statement-breakpoint
CREATE INDEX `commentNotifications_isRead_idx` ON `commentNotifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `activityFeed_userId_idx` ON `activityFeed` (`userId`);--> statement-breakpoint
CREATE INDEX `activityFeed_createdAt_idx` ON `activityFeed` (`createdAt`);--> statement-breakpoint
CREATE INDEX `parentId_idx` ON `comments` (`parentId`);--> statement-breakpoint
CREATE INDEX `rootId_idx` ON `comments` (`rootId`);