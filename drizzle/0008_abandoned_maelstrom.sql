CREATE TABLE `notifications` (
	`id` varchar(255) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`resourceType` varchar(50),
	`resourceId` varchar(255),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
