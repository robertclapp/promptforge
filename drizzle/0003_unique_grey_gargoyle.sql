CREATE TABLE `testRuns` (
	`id` varchar(64) NOT NULL,
	`suiteId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`status` enum('pending','running','passed','failed','error') NOT NULL,
	`gitCommit` varchar(64),
	`gitBranch` varchar(255),
	`results` json,
	`totalTests` int NOT NULL,
	`passedTests` int NOT NULL,
	`failedTests` int NOT NULL,
	`averageQuality` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `testRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testSuites` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`testCases` json NOT NULL,
	`qualityThreshold` int DEFAULT 80,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testSuites_id` PRIMARY KEY(`id`)
);
