-- Ensure "May be?" columns are marked as default
UPDATE "Column" SET "isDefault" = true WHERE "name" = 'May be?';

-- Also ensure other default columns are marked
UPDATE "Column" SET "isDefault" = true WHERE "name" IN ('Not Now', 'Done');
