-- AlterTable
-- First add column as nullable
ALTER TABLE "Item" ADD COLUMN "lastActiveAt" DATETIME;

-- Backfill lastActiveAt with updatedAt for existing records
UPDATE "Item" SET "lastActiveAt" = "updatedAt";

-- Create a new table with the constraint
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "order" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "assignedTo" TEXT,
    "columnId" TEXT NOT NULL,
    "boardId" INTEGER NOT NULL,
    CONSTRAINT "Item_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Item_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Copy data
INSERT INTO "new_Item" SELECT "id", "title", "content", "order", "createdAt", "updatedAt", "lastActiveAt", "createdBy", "assignedTo", "columnId", "boardId" FROM "Item";

-- Drop old table
DROP TABLE "Item";

-- Rename new table
ALTER TABLE "new_Item" RENAME TO "Item";
