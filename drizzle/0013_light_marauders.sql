CREATE TABLE `compliance_reports` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`reportType` varchar(50) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`format` varchar(10) NOT NULL,
	`fileUrl` varchar(512),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`summary` json,
	`requestedBy` varchar(64) NOT NULL,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `compliance_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ip_allowlist` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`ipAddress` varchar(50) NOT NULL,
	`isCidr` boolean NOT NULL DEFAULT false,
	`description` varchar(255),
	`enabled` boolean NOT NULL DEFAULT true,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ip_allowlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ip_allowlist_settings` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`enforceForApi` boolean NOT NULL DEFAULT true,
	`enforceForWeb` boolean NOT NULL DEFAULT false,
	`ownersBypass` boolean NOT NULL DEFAULT true,
	`violationAction` varchar(20) NOT NULL DEFAULT 'block',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ip_allowlist_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trusted_devices` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`deviceHash` varchar(255) NOT NULL,
	`deviceName` varchar(255),
	`userAgent` text,
	`ipAddress` varchar(45),
	`expiresAt` timestamp NOT NULL,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trusted_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `two_factor_settings` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`secret` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`verified` boolean NOT NULL DEFAULT false,
	`backupCodes` json,
	`backupCodesUsed` int NOT NULL DEFAULT 0,
	`lastVerifiedAt` timestamp,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `two_factor_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `compliance_reports_org_id_idx` ON `compliance_reports` (`organizationId`);--> statement-breakpoint
CREATE INDEX `compliance_reports_status_idx` ON `compliance_reports` (`status`);--> statement-breakpoint
CREATE INDEX `compliance_reports_created_at_idx` ON `compliance_reports` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ip_allowlist_org_id_idx` ON `ip_allowlist` (`organizationId`);--> statement-breakpoint
CREATE INDEX `ip_allowlist_ip_address_idx` ON `ip_allowlist` (`ipAddress`);--> statement-breakpoint
CREATE INDEX `ip_allowlist_settings_org_id_idx` ON `ip_allowlist_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `trusted_devices_user_id_idx` ON `trusted_devices` (`userId`);--> statement-breakpoint
CREATE INDEX `trusted_devices_device_hash_idx` ON `trusted_devices` (`deviceHash`);--> statement-breakpoint
CREATE INDEX `trusted_devices_expires_at_idx` ON `trusted_devices` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `two_factor_user_id_idx` ON `two_factor_settings` (`userId`);