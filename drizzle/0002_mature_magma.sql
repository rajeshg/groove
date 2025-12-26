CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`firstName` text,
	`lastName` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_accounts_email` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#e0e0e0' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_boards_accountId` ON `boards` (`accountId`);--> statement-breakpoint
CREATE TABLE `columns` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#94a3b8' NOT NULL,
	`order` real DEFAULT 0 NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`isExpanded` integer DEFAULT true NOT NULL,
	`shortcut` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_columns_boardId` ON `columns` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_columns_order` ON `columns` (`boardId`,`order`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`boardId` text NOT NULL,
	`columnId` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`order` real NOT NULL,
	`createdBy` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`lastActiveAt` text NOT NULL,
	FOREIGN KEY (`boardId`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`columnId`) REFERENCES `columns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_items_boardId` ON `items` (`boardId`);--> statement-breakpoint
CREATE INDEX `idx_items_columnId` ON `items` (`columnId`);--> statement-breakpoint
CREATE INDEX `idx_items_order` ON `items` (`columnId`,`order`);--> statement-breakpoint
CREATE TABLE `passwords` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`hash` text NOT NULL,
	`salt` text NOT NULL,
	FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passwords_accountId_unique` ON `passwords` (`accountId`);