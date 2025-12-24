CREATE TABLE `apiKeys` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`keyHash` text NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`rateLimit` int NOT NULL DEFAULT 1000,
	`lastUsedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiUsage` (
	`id` varchar(64) NOT NULL,
	`apiKeyId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`statusCode` int NOT NULL,
	`responseTime` int,
	`timestamp` timestamp DEFAULT (now()),
	CONSTRAINT `apiUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookDeliveries` (
	`id` varchar(64) NOT NULL,
	`webhookId` varchar(64) NOT NULL,
	`event` varchar(100) NOT NULL,
	`payload` json NOT NULL,
	`statusCode` int,
	`response` text,
	`attempts` int NOT NULL DEFAULT 1,
	`deliveredAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `webhookDeliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`url` varchar(500) NOT NULL,
	`events` json NOT NULL,
	`secret` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`lastTriggeredAt` timestamp,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
