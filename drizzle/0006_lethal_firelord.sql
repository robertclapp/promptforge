CREATE TABLE `templateCategories` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `templateCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templateCategoryMappings` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`categoryId` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `templateCategoryMappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templateRatings` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `templateRatings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templateUsage` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `templateUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `promptId_idx` ON `templateCategoryMappings` (`promptId`);--> statement-breakpoint
CREATE INDEX `categoryId_idx` ON `templateCategoryMappings` (`categoryId`);--> statement-breakpoint
CREATE INDEX `promptId_idx` ON `templateRatings` (`promptId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `templateRatings` (`userId`);--> statement-breakpoint
CREATE INDEX `promptId_idx` ON `templateUsage` (`promptId`);