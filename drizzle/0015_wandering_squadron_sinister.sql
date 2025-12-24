CREATE TABLE `known_devices` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`deviceFingerprint` varchar(128) NOT NULL,
	`deviceName` varchar(255),
	`browser` varchar(100),
	`os` varchar(100),
	`firstSeenAt` timestamp DEFAULT (now()),
	`lastSeenAt` timestamp DEFAULT (now()),
	`isTrusted` boolean NOT NULL DEFAULT true,
	CONSTRAINT `known_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `known_locations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`city` varchar(100),
	`region` varchar(100),
	`country` varchar(100),
	`countryCode` varchar(10),
	`firstSeenAt` timestamp DEFAULT (now()),
	`lastSeenAt` timestamp DEFAULT (now()),
	`isTrusted` boolean NOT NULL DEFAULT true,
	CONSTRAINT `known_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_activities` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`deviceFingerprint` varchar(128),
	`deviceName` varchar(255),
	`deviceType` varchar(50),
	`browser` varchar(100),
	`os` varchar(100),
	`userAgent` text,
	`ipAddress` varchar(45),
	`city` varchar(100),
	`region` varchar(100),
	`country` varchar(100),
	`countryCode` varchar(10),
	`latitude` varchar(20),
	`longitude` varchar(20),
	`loginStatus` varchar(20) NOT NULL DEFAULT 'success',
	`failureReason` varchar(255),
	`isNewDevice` boolean NOT NULL DEFAULT false,
	`isNewLocation` boolean NOT NULL DEFAULT false,
	`isSuspicious` boolean NOT NULL DEFAULT false,
	`notificationSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `login_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_notification_settings` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`notifyNewDevice` boolean NOT NULL DEFAULT true,
	`notifyNewLocation` boolean NOT NULL DEFAULT true,
	`notifyFailedLogin` boolean NOT NULL DEFAULT true,
	`notifySuspiciousActivity` boolean NOT NULL DEFAULT true,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`failedLoginThreshold` int NOT NULL DEFAULT 3,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `login_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `login_notification_settings_userId_unique` UNIQUE(`userId`)
);
