ALTER TABLE `submission-file` ADD `metadata` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `submission-file` ADD `order` integer DEFAULT 9007199254740991 NOT NULL;