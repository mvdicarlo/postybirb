CREATE TABLE `post-event` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`postRecordId` text NOT NULL,
	`accountId` text,
	`eventType` text NOT NULL,
	`fileId` text,
	`sourceUrl` text,
	`error` text,
	`metadata` text,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post-event_id_unique` ON `post-event` (`id`);--> statement-breakpoint
CREATE INDEX `idx_post_event_lookup` ON `post-event` (`postRecordId`,`accountId`,`eventType`);--> statement-breakpoint
CREATE INDEX `idx_post_event_file` ON `post-event` (`postRecordId`,`fileId`);