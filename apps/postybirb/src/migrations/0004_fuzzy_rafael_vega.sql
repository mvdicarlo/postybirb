CREATE TABLE `user-converter` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`convertTo` text NOT NULL,
	`username` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user-converter_id_unique` ON `user-converter` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user-converter_username_unique` ON `user-converter` (`username`);