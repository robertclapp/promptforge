CREATE TABLE `collectionShares` (
	`id` varchar(64) NOT NULL,
	`collectionId` varchar(64) NOT NULL,
	`sharedWithUserId` varchar(64),
	`sharedWithOrgId` varchar(64),
	`permission` varchar(20) DEFAULT 'view',
	`sharedBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `collectionShares_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`organizationId` varchar(64),
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(20) DEFAULT '#6366f1',
	`icon` varchar(50) DEFAULT 'folder',
	`parentId` varchar(64),
	`sortOrder` int DEFAULT 0,
	`isShared` boolean DEFAULT false,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptCollections` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`collectionId` varchar(64) NOT NULL,
	`addedBy` varchar(64) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `promptCollections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `collectionShares_collectionId_idx` ON `collectionShares` (`collectionId`);--> statement-breakpoint
CREATE INDEX `collectionShares_sharedWithUser_idx` ON `collectionShares` (`sharedWithUserId`);--> statement-breakpoint
CREATE INDEX `collectionShares_sharedWithOrg_idx` ON `collectionShares` (`sharedWithOrgId`);--> statement-breakpoint
CREATE INDEX `collections_userId_idx` ON `collections` (`userId`);--> statement-breakpoint
CREATE INDEX `collections_orgId_idx` ON `collections` (`organizationId`);--> statement-breakpoint
CREATE INDEX `collections_parentId_idx` ON `collections` (`parentId`);--> statement-breakpoint
CREATE INDEX `promptCollections_promptId_idx` ON `promptCollections` (`promptId`);--> statement-breakpoint
CREATE INDEX `promptCollections_collectionId_idx` ON `promptCollections` (`collectionId`);--> statement-breakpoint
CREATE INDEX `promptCollections_unique_idx` ON `promptCollections` (`promptId`,`collectionId`);