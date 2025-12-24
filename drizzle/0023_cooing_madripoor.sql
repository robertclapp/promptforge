CREATE TABLE `sharedPromptForks` (
	`id` varchar(64) NOT NULL,
	`sharedPromptId` varchar(64) NOT NULL,
	`forkedPromptId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `sharedPromptForks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedPromptViews` (
	`id` varchar(64) NOT NULL,
	`sharedPromptId` varchar(64) NOT NULL,
	`viewerIp` varchar(45),
	`userId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `sharedPromptViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sharedPrompts` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`shareCode` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`accessLevel` enum('view','fork') NOT NULL DEFAULT 'view',
	`password` varchar(255),
	`expiresAt` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`forkCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `sharedPrompts_id` PRIMARY KEY(`id`),
	CONSTRAINT `sharedPrompts_shareCode_unique` UNIQUE(`shareCode`)
);
--> statement-breakpoint
CREATE INDEX `fork_sharedPromptId_idx` ON `sharedPromptForks` (`sharedPromptId`);--> statement-breakpoint
CREATE INDEX `fork_userId_idx` ON `sharedPromptForks` (`userId`);--> statement-breakpoint
CREATE INDEX `view_sharedPromptId_idx` ON `sharedPromptViews` (`sharedPromptId`);--> statement-breakpoint
CREATE INDEX `shared_promptId_idx` ON `sharedPrompts` (`promptId`);--> statement-breakpoint
CREATE INDEX `shared_userId_idx` ON `sharedPrompts` (`userId`);--> statement-breakpoint
CREATE INDEX `shared_shareCode_idx` ON `sharedPrompts` (`shareCode`);