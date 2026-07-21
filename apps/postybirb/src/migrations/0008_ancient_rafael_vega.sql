CREATE TABLE `post-job` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`version` text,
	`submissionId` text NOT NULL,
	`attemptOf` text,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`resumeMode` text DEFAULT 'NEW' NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attemptOf`) REFERENCES `post-job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-job_id_unique` ON `post-job` (`id`);--> statement-breakpoint
CREATE INDEX `idx_post_job_submission` ON `post-job` (`submissionId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_post_job_status` ON `post-job` (`status`);--> statement-breakpoint
CREATE TABLE `post-rate-window` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`key` text NOT NULL,
	`lastPostedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-rate-window_id_unique` ON `post-rate-window` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `post-rate-window_key_unique` ON `post-rate-window` (`key`);--> statement-breakpoint
CREATE TABLE `post-task` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`jobId` text NOT NULL,
	`accountId` text,
	`websiteId` text NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`dependency` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`maxAttempts` integer DEFAULT 3 NOT NULL,
	`sourceUrl` text,
	`message` text,
	`error` text,
	`waitingUntil` integer,
	`accountSnapshot` text,
	FOREIGN KEY (`jobId`) REFERENCES `post-job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-task_id_unique` ON `post-task` (`id`);--> statement-breakpoint
CREATE INDEX `idx_post_task_job` ON `post-task` (`jobId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_post_task_account` ON `post-task` (`jobId`,`accountId`);--> statement-breakpoint
CREATE TABLE `post-unit` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`taskId` text NOT NULL,
	`kind` text NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`fileIds` text DEFAULT '[]' NOT NULL,
	`sourceUrl` text,
	`error` text,
	FOREIGN KEY (`taskId`) REFERENCES `post-task`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-unit_id_unique` ON `post-unit` (`id`);--> statement-breakpoint
CREATE INDEX `idx_post_unit_task` ON `post-unit` (`taskId`);--> statement-breakpoint
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