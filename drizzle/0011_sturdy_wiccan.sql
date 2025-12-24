CREATE TABLE `audit_logs` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64),
	`userName` varchar(255),
	`userEmail` varchar(320),
	`userRole` enum('viewer','member','admin','owner'),
	`organizationId` varchar(64),
	`organizationName` varchar(255),
	`eventType` varchar(64) NOT NULL,
	`eventCategory` enum('permission','resource','team','billing','api','security') NOT NULL,
	`resourceType` varchar(64),
	`resourceId` varchar(64),
	`resourceName` varchar(255),
	`action` enum('create','read','update','delete','execute','denied') NOT NULL,
	`status` enum('success','failure','denied') NOT NULL,
	`details` json,
	`previousValue` json,
	`newValue` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`requestId` varchar(64),
	`requiredPermission` varchar(64),
	`userPermissions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_permission_overrides` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`role` enum('viewer','member','admin') NOT NULL,
	`permission` varchar(64) NOT NULL,
	`granted` boolean NOT NULL,
	`createdBy` varchar(64) NOT NULL,
	`updatedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_permission_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_logs_organization_id_idx` ON `audit_logs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `audit_logs_event_type_idx` ON `audit_logs` (`eventType`);--> statement-breakpoint
CREATE INDEX `audit_logs_event_category_idx` ON `audit_logs` (`eventCategory`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_type_idx` ON `audit_logs` (`resourceType`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_id_idx` ON `audit_logs` (`resourceId`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_status_idx` ON `audit_logs` (`status`);--> statement-breakpoint
CREATE INDEX `workspace_perm_org_role_perm_idx` ON `workspace_permission_overrides` (`organizationId`,`role`,`permission`);--> statement-breakpoint
CREATE INDEX `workspace_perm_org_id_idx` ON `workspace_permission_overrides` (`organizationId`);