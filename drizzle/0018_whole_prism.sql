CREATE TABLE `email_preferences` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`security_alerts` boolean NOT NULL DEFAULT true,
	`evaluation_complete` boolean NOT NULL DEFAULT true,
	`budget_warnings` boolean NOT NULL DEFAULT true,
	`weekly_digest` boolean NOT NULL DEFAULT false,
	`monthly_report` boolean NOT NULL DEFAULT false,
	`team_updates` boolean NOT NULL DEFAULT true,
	`email_address` varchar(255),
	`timezone` varchar(64) DEFAULT 'UTC',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_deliveries` (
	`id` varchar(64) NOT NULL,
	`report_id` varchar(64) NOT NULL,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`recipients` json NOT NULL,
	`status` enum('sent','failed','partial') NOT NULL,
	`error_message` text,
	`report_data` json,
	`attachment_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_reports` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`workspace_id` varchar(64),
	`name` varchar(255) NOT NULL,
	`report_type` enum('api_usage','security_summary','evaluation_metrics','budget_status','team_activity','comprehensive') NOT NULL,
	`frequency` enum('daily','weekly','monthly') NOT NULL,
	`day_of_week` int,
	`day_of_month` int,
	`hour` int NOT NULL DEFAULT 9,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`email_recipients` json NOT NULL,
	`include_attachment` boolean NOT NULL DEFAULT true,
	`attachment_format` enum('pdf','csv','json') DEFAULT 'pdf',
	`is_active` boolean NOT NULL DEFAULT true,
	`last_sent_at` timestamp,
	`next_scheduled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduled_reports_id` PRIMARY KEY(`id`)
);
