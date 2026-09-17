-- Add customer moderation state. isDeleted is a soft-delete marker so order history remains intact.
ALTER TABLE "users"
  ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
