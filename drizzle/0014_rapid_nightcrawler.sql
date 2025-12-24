CREATE TABLE `password_history` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_policies` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`minLength` int NOT NULL DEFAULT 8,
	`maxLength` int NOT NULL DEFAULT 128,
	`requireUppercase` boolean NOT NULL DEFAULT true,
	`requireLowercase` boolean NOT NULL DEFAULT true,
	`requireNumbers` boolean NOT NULL DEFAULT true,
	`requireSpecialChars` boolean NOT NULL DEFAULT false,
	`expirationDays` int NOT NULL DEFAULT 0,
	`warningDays` int NOT NULL DEFAULT 14,
	`historyCount` int NOT NULL DEFAULT 5,
	`maxFailedAttempts` int NOT NULL DEFAULT 5,
	`lockoutDurationMinutes` int NOT NULL DEFAULT 15,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `password_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_onboarding` (
	`id` varchar(64) NOT NULL,
	`organizationId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`twoFactorSetup` boolean NOT NULL DEFAULT false,
	`ipAllowlistSetup` boolean NOT NULL DEFAULT false,
	`securityAlertsSetup` boolean NOT NULL DEFAULT false,
	`passwordPolicySetup` boolean NOT NULL DEFAULT false,
	`teamRolesReviewed` boolean NOT NULL DEFAULT false,
	`auditLoggingReviewed` boolean NOT NULL DEFAULT false,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`isDismissed` boolean NOT NULL DEFAULT false,
	`dismissedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `security_onboarding_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`deviceName` varchar(255),
	`deviceType` varchar(50),
	`browser` varchar(100),
	`os` varchar(100),
	`userAgent` text,
	`ipAddress` varchar(45),
	`city` varchar(100),
	`country` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`isCurrent` boolean NOT NULL DEFAULT false,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `password_history_user_id_idx` ON `password_history` (`userId`);--> statement-breakpoint
CREATE INDEX `password_history_created_at_idx` ON `password_history` (`createdAt`);--> statement-breakpoint
CREATE INDEX `password_policies_org_id_idx` ON `password_policies` (`organizationId`);--> statement-breakpoint
CREATE INDEX `security_onboarding_org_id_idx` ON `security_onboarding` (`organizationId`);--> statement-breakpoint
CREATE INDEX `security_onboarding_user_id_idx` ON `security_onboarding` (`userId`);--> statement-breakpoint
CREATE INDEX `user_sessions_user_id_idx` ON `user_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `user_sessions_token_hash_idx` ON `user_sessions` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `user_sessions_is_active_idx` ON `user_sessions` (`isActive`);--> statement-breakpoint
CREATE INDEX `user_sessions_expires_at_idx` ON `user_sessions` (`expiresAt`);