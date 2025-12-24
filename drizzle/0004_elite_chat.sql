CREATE TABLE `optimizations` (
	`id` varchar(64) NOT NULL,
	`promptId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`originalPrompt` text NOT NULL,
	`optimizedPrompt` text NOT NULL,
	`suggestions` json NOT NULL,
	`applied` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `optimizations_id` PRIMARY KEY(`id`)
);
