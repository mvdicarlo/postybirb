CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`name` text NOT NULL,
	`website` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `directory-watcher` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`path` text NOT NULL,
	`importActions` text DEFAULT 'NEW_SUBMISSION' NOT NULL,
	`templateId` integer NOT NULL,
	FOREIGN KEY (`templateId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `file-buffer` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`submissionFileId` integer NOT NULL,
	`buffer` blob NOT NULL,
	`fileName` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`submissionFileId`) REFERENCES `submission-file`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `post-queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`postRecordId` integer NOT NULL,
	`submissionId` integer NOT NULL,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `post-record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`state` text DEFAULT 'PENDING' NOT NULL,
	`resumeMode` text DEFAULT 'CONTINUE' NOT NULL,
	`submissionId` integer NOT NULL,
	`completedAt` text,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`profile` text DEFAULT 'default' NOT NULL,
	`data` text DEFAULT '{"hiddenWebsites":[],"language":"en","allowAd":true,"queuePaused":false}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_profile_unique` ON `settings` (`profile`);--> statement-breakpoint
CREATE TABLE `submission-file` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`submissionId` integer NOT NULL,
	`fileName` text NOT NULL,
	`hash` text NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`mimeType` text NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`hasThumbnail` integer DEFAULT false NOT NULL,
	`hasAltFile` integer DEFAULT false NOT NULL,
	`primaryFileId` integer NOT NULL,
	`thumbnailId` integer NOT NULL,
	`altFileId` integer NOT NULL,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primaryFileId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`thumbnailId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`altFileId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`submissionType` text NOT NULL,
	`isScheduled` integer DEFAULT false,
	`isTemplate` integer DEFAULT false,
	`schedule` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tag-converter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`tag` text NOT NULL,
	`convertTo` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag-converter_tag_unique` ON `tag-converter` (`tag`);--> statement-breakpoint
CREATE TABLE `tag-group` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`name` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag-group_name_unique` ON `tag-group` (`name`);--> statement-breakpoint
CREATE TABLE `user-specified-website-options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`options` text DEFAULT '{}' NOT NULL,
	`submissionType` text NOT NULL,
	`accountId` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `website-data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`name` text NOT NULL,
	`website` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`accountId` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `website-options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`data` text DEFAULT '{}' NOT NULL,
	`accountId` integer NOT NULL,
	`submissionId` integer NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `website-post-record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP),
	`postRecordId` integer NOT NULL,
	`accountId` integer NOT NULL,
	`completedAt` text,
	`errors` text DEFAULT '[]',
	`postData` text,
	`metadata` text DEFAULT '{"sourceMap":{},"postedFiles":[],"nextBatchNumber":1}' NOT NULL,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE no action
);
