CREATE TABLE `boardInvitations` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invitedBy` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitedBy`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_boardId` ON `boardInvitations` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_email` ON `boardInvitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_status` ON `boardInvitations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_unique` ON `boardInvitations` (`email`,`boardId`);