DROP TABLE `user-specified-website-options`;--> statement-breakpoint
ALTER TABLE `account` ADD `defaultFileTemplateId` text REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `account` ADD `defaultMessageTemplateId` text REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null;
