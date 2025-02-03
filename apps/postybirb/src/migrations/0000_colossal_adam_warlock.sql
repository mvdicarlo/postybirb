CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`name` text NOT NULL,
	`website` text NOT NULL,
	`groups` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_id_unique` ON `account` (`id`);--> statement-breakpoint
CREATE TABLE `directory-watcher` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`path` text,
	`importAction` text DEFAULT 'NEW_SUBMISSION' NOT NULL,
	`templateId` text,
	FOREIGN KEY (`templateId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `directory-watcher_id_unique` ON `directory-watcher` (`id`);--> statement-breakpoint
CREATE TABLE `file-buffer` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`submissionFileId` text NOT NULL,
	`buffer` blob NOT NULL,
	`fileName` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	FOREIGN KEY (`submissionFileId`) REFERENCES `submission-file`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file-buffer_id_unique` ON `file-buffer` (`id`);--> statement-breakpoint
CREATE TABLE `post-queue` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`postRecordId` text,
	`submissionId` text NOT NULL,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-queue_id_unique` ON `post-queue` (`id`);--> statement-breakpoint
CREATE TABLE `post-record` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`state` text DEFAULT 'PENDING' NOT NULL,
	`resumeMode` text DEFAULT 'CONTINUE' NOT NULL,
	`submissionId` text,
	`postQueueRecordId` text,
	`completedAt` text,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`postQueueRecordId`) REFERENCES `post-queue`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-record_id_unique` ON `post-record` (`id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`profile` text DEFAULT 'default' NOT NULL,
	`settings` text DEFAULT '{"hiddenWebsites":[],"language":"en","allowAd":true,"queuePaused":false}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_id_unique` ON `settings` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_profile_unique` ON `settings` (`profile`);--> statement-breakpoint
CREATE TABLE `submission-file` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`fileName` text NOT NULL,
	`hash` text NOT NULL,
	`size` integer NOT NULL,
	`mimeType` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`hasThumbnail` integer NOT NULL,
	`hasAltFile` integer DEFAULT false NOT NULL,
	`hasCustomThumbnail` integer DEFAULT false NOT NULL,
	`submissionId` text NOT NULL,
	`primaryFileId` text,
	`thumbnailId` text,
	`altFileId` text,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primaryFileId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`thumbnailId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`altFileId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission-file_id_unique` ON `submission-file` (`id`);--> statement-breakpoint
CREATE TABLE `submission` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`type` text NOT NULL,
	`isScheduled` integer NOT NULL,
	`isTemplate` integer NOT NULL,
	`isMultiSubmission` integer NOT NULL,
	`isArchived` integer DEFAULT false,
	`schedule` text NOT NULL,
	`metadata` text NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_id_unique` ON `submission` (`id`);--> statement-breakpoint
CREATE TABLE `tag-converter` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`tag` text NOT NULL,
	`convertTo` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag-converter_id_unique` ON `tag-converter` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tag-converter_tag_unique` ON `tag-converter` (`tag`);--> statement-breakpoint
CREATE TABLE `tag-group` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`name` text NOT NULL,
	`tags` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag-group_id_unique` ON `tag-group` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tag-group_name_unique` ON `tag-group` (`name`);--> statement-breakpoint
CREATE TABLE `user-specified-website-options` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`type` text NOT NULL,
	`options` text NOT NULL,
	`accountId` text NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user-specified-website-options_id_unique` ON `user-specified-website-options` (`id`);--> statement-breakpoint
CREATE TABLE `website-data` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`accountId` text NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website-data_id_unique` ON `website-data` (`id`);--> statement-breakpoint
CREATE TABLE `website-options` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`data` text NOT NULL,
	`isDefault` integer NOT NULL,
	`accountId` text NOT NULL,
	`submissionId` text NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website-options_id_unique` ON `website-options` (`id`);--> statement-breakpoint
CREATE TABLE `website-post-record` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`postRecordId` text NOT NULL,
	`accountId` text NOT NULL,
	`completedAt` text,
	`errors` text DEFAULT '[]',
	`postData` text,
	`metadata` text DEFAULT '{"sourceMap":{},"postedFiles":[],"nextBatchNumber":1}' NOT NULL,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website-post-record_id_unique` ON `website-post-record` (`id`);