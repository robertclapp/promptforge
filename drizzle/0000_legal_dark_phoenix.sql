CREATE TABLE `aiProviders` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`provider` enum('openai','anthropic','google','mistral','custom') NOT NULL,
	`name` varchar(255) NOT NULL,
	`apiKeyEncrypted` text NOT NULL,
	`baseUrl` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastUsedAt` timestamp,
	CONSTRAINT `aiProviders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analyticsEvents` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`eventType` varchar(100) NOT NULL,
	`eventData` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `analyticsEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contextPackages` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`name` varchar(255) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`fileUrls` json,
	`tags` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `contextPackages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationResults` (
	`id` varchar(64) NOT NULL,
	`evaluationId` varchar(64) NOT NULL,
	`providerId` varchar(64) NOT NULL,
	`model` varchar(100) NOT NULL,
	`testCaseIndex` int NOT NULL,
	`input` json NOT NULL,
	`output` text NOT NULL,
	`tokensUsed` int NOT NULL,
	`latencyMs` int NOT NULL,
	`cost` int NOT NULL,
	`quality` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `evaluationResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`name` varchar(255) NOT NULL,
	`description` text,
	`promptId` varchar(64) NOT NULL,
	`testCases` json NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizationMemberships` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`createdAt` timestamp DEFAULT (now()),
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `organizationMemberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`ownerId` varchar(64) NOT NULL,
	`subscriptionTier` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `promptVersions` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`version` int NOT NULL,
	`content` text NOT NULL,
	`variables` json,
	`changeMessage` text,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promptVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`name` varchar(255) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`variables` json,
	`tags` json,
	`folderPath` varchar(500) NOT NULL DEFAULT '/',
	`isTemplate` boolean NOT NULL DEFAULT false,
	`isPublic` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `prompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp DEFAULT (now()),
	`lastSignedIn` timestamp DEFAULT (now()),
	`subscriptionTier` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
	`apiCallsUsed` int NOT NULL DEFAULT 0,
	`apiCallsLimit` int NOT NULL DEFAULT 1000,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
