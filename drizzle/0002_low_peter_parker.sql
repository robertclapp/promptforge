CREATE TABLE `budgetAlerts` (
	`id` varchar(64) NOT NULL,
	`budgetId` varchar(64) NOT NULL,
	`threshold` int NOT NULL,
	`isTriggered` boolean NOT NULL DEFAULT false,
	`triggeredAt` timestamp,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `budgetAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`name` varchar(255) NOT NULL,
	`amount` int NOT NULL,
	`period` enum('daily','weekly','monthly','yearly') NOT NULL DEFAULT 'monthly',
	`startDate` datetime NOT NULL,
	`endDate` datetime,
	`providers` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`currentSpend` int NOT NULL DEFAULT 0,
	`lastResetAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
