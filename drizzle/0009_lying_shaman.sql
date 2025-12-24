CREATE TABLE `team_invitations` (
	`id` varchar(191) NOT NULL,
	`organization_id` varchar(191) NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`invited_by` varchar(191) NOT NULL,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `org_idx` ON `team_invitations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `team_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `team_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `team_invitations` (`status`);