PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`type` text NOT NULL,
	`isArchived` integer DEFAULT false,
	`isInitialized` integer DEFAULT false,
	`isMultiSubmission` integer NOT NULL,
	`isScheduled` integer NOT NULL,
	`isTemplate` integer NOT NULL,
	`metadata` text NOT NULL,
	`order` real NOT NULL,
	`schedule` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_submission`("id", "createdAt", "updatedAt", "type", "isArchived", "isInitialized", "isMultiSubmission", "isScheduled", "isTemplate", "metadata", "order", "schedule") SELECT "id", "createdAt", "updatedAt", "type", "isArchived", "isInitialized", "isMultiSubmission", "isScheduled", "isTemplate", "metadata", "order", "schedule" FROM `submission`;--> statement-breakpoint
DROP TABLE `submission`;--> statement-breakpoint
ALTER TABLE `__new_submission` RENAME TO `submission`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `submission_id_unique` ON `submission` (`id`);