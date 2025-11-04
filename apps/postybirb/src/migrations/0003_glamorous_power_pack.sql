PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_website-post-record` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`accountId` text,
	`postRecordId` text NOT NULL,
	`completedAt` text,
	`errors` text NOT NULL,
	`metadata` text NOT NULL,
	`postData` text NOT NULL,
	`postResponse` text,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_website-post-record`("id", "createdAt", "updatedAt", "accountId", "postRecordId", "completedAt", "errors", "metadata", "postData", "postResponse") SELECT "id", "createdAt", "updatedAt", "accountId", "postRecordId", "completedAt", "errors", "metadata", "postData", "postResponse" FROM `website-post-record`;--> statement-breakpoint
DROP TABLE `website-post-record`;--> statement-breakpoint
ALTER TABLE `__new_website-post-record` RENAME TO `website-post-record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `website-post-record_id_unique` ON `website-post-record` (`id`);