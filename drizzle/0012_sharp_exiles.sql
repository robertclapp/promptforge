CREATE TABLE `archived_audit_logs` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`archiveDate` timestamp NOT NULL DEFAULT (now()),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`logCount` int NOT NULL,
	`archivedData` json,
	`archiveUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `archived_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_retention_settings` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`retentionDays` int NOT NULL DEFAULT 90,
	`archiveBeforeDelete` boolean NOT NULL DEFAULT true,
	`lastCleanupAt` timestamp,
	`lastCleanupCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_retention_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_alert_settings` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`permissionDenialThreshold` int NOT NULL DEFAULT 5,
	`permissionDenialWindowMinutes` int NOT NULL DEFAULT 15,
	`bulkDeletionThreshold` int NOT NULL DEFAULT 10,
	`bulkDeletionWindowMinutes` int NOT NULL DEFAULT 30,
	`loginAttemptThreshold` int NOT NULL DEFAULT 5,
	`loginAttemptWindowMinutes` int NOT NULL DEFAULT 10,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `security_alert_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('create','read','update','delete','execute','denied','alert') NOT NULL;--> statement-breakpoint
CREATE INDEX `archived_audit_org_id_idx` ON `archived_audit_logs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `archived_audit_date_idx` ON `archived_audit_logs` (`archiveDate`);--> statement-breakpoint
CREATE INDEX `audit_retention_org_id_idx` ON `audit_retention_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `security_alert_org_id_idx` ON `security_alert_settings` (`organizationId`);