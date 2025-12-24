ALTER TABLE `exportSchedules` ADD `notifyOnSuccess` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `exportSchedules` ADD `notifyOnFailure` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `exportSchedules` ADD `enableCompression` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `importExportHistory` ADD `isCompressed` boolean DEFAULT false;