CREATE TABLE `data_deletion_requests` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`deletionType` enum('full','prompts','evaluations','activity') NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`confirmationCode` varchar(64),
	`confirmedAt` timestamp,
	`deletedRecords` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`requestedAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `data_deletion_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_export_requests` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`exportType` enum('full','prompts','evaluations','settings','activity') NOT NULL,
	`format` enum('json','csv','zip') NOT NULL DEFAULT 'zip',
	`status` enum('pending','processing','completed','failed','expired') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`fileUrl` text,
	`fileSize` int,
	`includedData` json,
	`errorMessage` text,
	`requestedAt` timestamp DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`expiresAt` timestamp,
	CONSTRAINT `data_export_requests_id` PRIMARY KEY(`id`)
);
