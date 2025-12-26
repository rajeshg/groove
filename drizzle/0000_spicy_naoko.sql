CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`text` text NOT NULL,
	`description` text,
	`completed` integer DEFAULT false,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_todos_userId` ON `todos` (`userId`);