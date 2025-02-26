PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_website-data` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_website-data`("id", "createdAt", "data", "updatedAt") SELECT "id", "createdAt", "data", "updatedAt" FROM `website-data`;--> statement-breakpoint
DROP TABLE `website-data`;--> statement-breakpoint
ALTER TABLE `__new_website-data` RENAME TO `website-data`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `website-data_id_unique` ON `website-data` (`id`);