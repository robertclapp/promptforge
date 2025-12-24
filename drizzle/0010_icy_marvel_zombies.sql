CREATE TABLE `subscriptionPlans` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`tier` varchar(50) NOT NULL,
	`stripePriceId` varchar(255),
	`price` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'usd',
	`interval` varchar(20) NOT NULL,
	`maxPrompts` int DEFAULT -1,
	`maxEvaluations` int DEFAULT -1,
	`maxApiCalls` int DEFAULT -1,
	`maxMembers` int DEFAULT -1,
	`features` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `subscriptionPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceSubscriptions` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`stripePriceId` varchar(255),
	`tier` varchar(50) NOT NULL DEFAULT 'free',
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `workspaceSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceUsage` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`month` varchar(7) NOT NULL,
	`promptsCreated` int NOT NULL DEFAULT 0,
	`evaluationsRun` int NOT NULL DEFAULT 0,
	`apiCallsMade` int NOT NULL DEFAULT 0,
	`storageUsedMB` int NOT NULL DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `workspaceUsage_id` PRIMARY KEY(`id`)
);
