ALTER TABLE `todos` ADD `dueDate` text;--> statement-breakpoint
CREATE INDEX `idx_todos_dueDate` ON `todos` (`dueDate`);