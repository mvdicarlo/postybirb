CREATE TABLE `post` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`submissionId` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`cancelled` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_id_unique` ON `post` (`id`);--> statement-breakpoint
CREATE TABLE `unit-of-work` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`postId` text NOT NULL,
	`submissionId` text NOT NULL,
	`accountId` text NOT NULL,
	`fileId` text,
	`fileHash` text,
	`attempt` integer DEFAULT 0 NOT NULL,
	`data` text,
	`response` text,
	`evicted` integer DEFAULT false NOT NULL,
	`url` text,
	`batch` text,
	`state` text DEFAULT 'NEW' NOT NULL,
	FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `account`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fileId`) REFERENCES `submission-file`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unit-of-work_id_unique` ON `unit-of-work` (`id`);