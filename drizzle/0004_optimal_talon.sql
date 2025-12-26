CREATE TABLE `assignees` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`name` text NOT NULL,
	`userId` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_assignees_boardId` ON `assignees` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_assignees_userId` ON `assignees` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_assignees_name_boardId` ON `assignees` (`name`,`boardId`);--> statement-breakpoint
ALTER TABLE `items` ADD `assigneeId` text REFERENCES assignees(id);--> statement-breakpoint
CREATE INDEX `idx_items_assigneeId` ON `items` (`assigneeId`);