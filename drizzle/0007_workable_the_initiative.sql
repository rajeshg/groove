CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`itemId` text,
	`accountId` text,
	`type` text NOT NULL,
	`content` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_activities_boardId` ON `activities` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_activities_itemId` ON `activities` (`itemId`);--> statement-breakpoint
CREATE INDEX `idx_activities_accountId` ON `activities` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_activities_createdAt` ON `activities` (`createdAt`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_boardInvitations` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invitedBy` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitedBy`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_boardInvitations`("id", "boardId", "email", "role", "status", "invitedBy", "createdAt", "updatedAt") SELECT "id", "boardId", "email", "role", "status", "invitedBy", "createdAt", "updatedAt" FROM `boardInvitations`;--> statement-breakpoint
DROP TABLE `boardInvitations`;--> statement-breakpoint
ALTER TABLE `__new_boardInvitations` RENAME TO `boardInvitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_boardId` ON `boardInvitations` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_email` ON `boardInvitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_status` ON `boardInvitations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boardInvitations_unique` ON `boardInvitations` (`email`,`boardId`);--> statement-breakpoint
CREATE TABLE `__new_boardMembers` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`accountId` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_boardMembers`("id", "boardId", "accountId", "role", "createdAt") SELECT "id", "boardId", "accountId", "role", "createdAt" FROM `boardMembers`;--> statement-breakpoint
DROP TABLE `boardMembers`;--> statement-breakpoint
ALTER TABLE `__new_boardMembers` RENAME TO `boardMembers`;--> statement-breakpoint
CREATE INDEX `idx_boardMembers_boardId` ON `boardMembers` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_boardMembers_accountId` ON `boardMembers` (`accountId`);--> statement-breakpoint
CREATE INDEX `idx_boardMembers_unique` ON `boardMembers` (`boardId`,`accountId`);