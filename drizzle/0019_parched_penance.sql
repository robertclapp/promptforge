CREATE TABLE `user_onboarding` (
`id` varchar(64) NOT NULL,
`user_id` varchar(64) NOT NULL,
`has_created_prompt` boolean NOT NULL DEFAULT false,
`has_connected_provider` boolean NOT NULL DEFAULT false,
`has_run_evaluation` boolean NOT NULL DEFAULT false,
`has_explored_marketplace` boolean NOT NULL DEFAULT false,
`has_setup_team` boolean NOT NULL DEFAULT false,
`is_wizard_dismissed` boolean NOT NULL DEFAULT false,
`current_step` varchar(64),
`completed_steps` json,
`completed_at` timestamp,
`created_at` timestamp NOT NULL DEFAULT (now()),
`updated_at` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `user_onboarding_id` PRIMARY KEY(`id`),
CONSTRAINT `user_onboarding_user_id_unique` UNIQUE(`user_id`)
);
