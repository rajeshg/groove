CREATE TABLE `boardMembers` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`accountId` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_boardMembers_boardId` ON `boardMembers` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_boardMembers_accountId` ON `boardMembers` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_boardMembers_unique` ON `boardMembers` (`boardId`,`accountId`);