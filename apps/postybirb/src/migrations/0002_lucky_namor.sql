PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_website-post-record` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`postRecordId` text NOT NULL,
	`accountId` text NOT NULL,
	`completedAt` text,
	`errors` text NOT NULL,
	`postData` text NOT NULL,
	`metadata` text NOT NULL,
	FOREIGN KEY (`postRecordId`) REFERENCES `post-record`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_website-post-record`("id", "createdAt", "updatedAt", "postRecordId", "accountId", "completedAt", "errors", "postData", "metadata") SELECT "id", "createdAt", "updatedAt", "postRecordId", "accountId", "completedAt", "errors", "postData", "metadata" FROM `website-post-record`;--> statement-breakpoint
DROP TABLE `website-post-record`;--> statement-breakpoint
ALTER TABLE `__new_website-post-record` RENAME TO `website-post-record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `website-post-record_id_unique` ON `website-post-record` (`id`);