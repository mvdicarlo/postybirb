ALTER TABLE `submission` ADD `isInitialized` integer DEFAULT false;--> statement-breakpoint
UPDATE `submission` SET `isInitialized` = true;