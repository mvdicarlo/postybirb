CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`tags` text NOT NULL,
	`data` text NOT NULL,
	`isRead` integer DEFAULT false NOT NULL,
	`hasEmitted` integer DEFAULT false NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_id_unique` ON `notification` (`id`);