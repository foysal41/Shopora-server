ALTER TABLE "Coupon"
  ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "usageLimit" INTEGER,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "createdById" TEXT;

ALTER TABLE "Notification"
  ADD COLUMN "targetRole" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Coupon_couponCode_idx" ON "Coupon"("couponCode");
CREATE INDEX "Coupon_expiryDate_idx" ON "Coupon"("expiryDate");
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");
CREATE INDEX "Coupon_createdById_idx" ON "Coupon"("createdById");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX "Notification_targetRole_idx" ON "Notification"("targetRole");

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
