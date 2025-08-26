CREATE TABLE `custom-shortcut` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`name` text NOT NULL,
	`shortcut` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `custom-shortcut_id_unique` ON `custom-shortcut` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `custom-shortcut_name_unique` ON `custom-shortcut` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`profile` text DEFAULT 'default' NOT NULL,
	`settings` text DEFAULT '{"hiddenWebsites":[],"language":"en","allowAd":true,"queuePaused":false,"desktopNotifications":{"enabled":true,"showOnPostSuccess":true,"showOnPostError":true,"showOnDirectoryWatcherError":true,"showOnDirectoryWatcherSuccess":true},"tagSearchProvider":{"showWikiInHelpOnHover":false}}' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "createdAt", "updatedAt", "profile", "settings") SELECT "id", "createdAt", "updatedAt", "profile", "settings" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `settings_id_unique` ON `settings` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_profile_unique` ON `settings` (`profile`);