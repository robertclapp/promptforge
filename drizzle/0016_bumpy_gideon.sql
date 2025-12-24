CREATE TABLE `rateLimitHits` (
	`id` varchar(64) NOT NULL,
	`apiKeyId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`endpoint` varchar(255),
	`hitCount` int NOT NULL DEFAULT 1,
	`windowStart` timestamp NOT NULL,
	`windowEnd` timestamp NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `rateLimitHits_id` PRIMARY KEY(`id`)
);
