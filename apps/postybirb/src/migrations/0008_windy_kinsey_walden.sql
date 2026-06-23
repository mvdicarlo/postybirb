DROP TABLE `user-specified-website-options`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`groups` text NOT NULL,
	`name` text NOT NULL,
	`website` text NOT NULL,
	`defaultFileTemplateId` text,
	`defaultMessageTemplateId` text,
	FOREIGN KEY (`defaultFileTemplateId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`defaultMessageTemplateId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_account`("id", "createdAt", "updatedAt", "groups", "name", "website") SELECT "id", "createdAt", "updatedAt", "groups", "name", "website" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `account_id_unique` ON `account` (`id`);
