CREATE TABLE `activityFeed` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`action` varchar(100) NOT NULL,
	`resourceType` varchar(50) NOT NULL,
	`resourceId` varchar(64) NOT NULL,
	`resourceName` varchar(255),
	`metadata` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `activityFeed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `activityFeed` (`userId`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `activityFeed` (`createdAt`);--> statement-breakpoint
CREATE INDEX `promptId_idx` ON `comments` (`promptId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `comments` (`userId`);