PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submission-file` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`fileName` text NOT NULL,
	`hash` text NOT NULL,
	`size` integer NOT NULL,
	`mimeType` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`hasThumbnail` integer NOT NULL,
	`hasAltFile` integer DEFAULT false NOT NULL,
	`hasCustomThumbnail` integer DEFAULT false NOT NULL,
	`submissionId` text NOT NULL,
	`primaryFileId` text,
	`thumbnailId` text,
	`altFileId` text,
	FOREIGN KEY (`submissionId`) REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primaryFileId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`thumbnailId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`altFileId`) REFERENCES `file-buffer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_submission-file`("id", "createdAt", "updatedAt", "fileName", "hash", "size", "mimeType", "width", "height", "hasThumbnail", "hasAltFile", "hasCustomThumbnail", "submissionId", "primaryFileId", "thumbnailId", "altFileId") SELECT "id", "createdAt", "updatedAt", "fileName", "hash", "size", "mimeType", "width", "height", "hasThumbnail", "hasAltFile", "hasCustomThumbnail", "submissionId", "primaryFileId", "thumbnailId", "altFileId" FROM `submission-file`;--> statement-breakpoint
DROP TABLE `submission-file`;--> statement-breakpoint
ALTER TABLE `__new_submission-file` RENAME TO `submission-file`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `submission-file_id_unique` ON `submission-file` (`id`);