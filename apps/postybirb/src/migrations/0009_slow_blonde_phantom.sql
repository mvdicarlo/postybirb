DROP TABLE `post-event`;--> statement-breakpoint
DROP TABLE `post-record`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_post-queue` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`submissionId` text NOT NULL,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_post-queue`("id", "createdAt", "updatedAt", "submissionId") SELECT "id", "createdAt", "updatedAt", "submissionId" FROM `post-queue`;--> statement-breakpoint
DROP TABLE `post-queue`;--> statement-breakpoint
ALTER TABLE `__new_post-queue` RENAME TO `post-queue`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `post-queue_id_unique` ON `post-queue` (`id`);