-- Add product review aggregates.
ALTER TABLE "Product"
  ADD COLUMN "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "reviews" INTEGER NOT NULL DEFAULT 0;

-- Create reviews and enforce one review per customer/product.
CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_productId_customerId_key" ON "Review"("productId", "customerId");
CREATE INDEX "Review_productId_idx" ON "Review"("productId");
CREATE INDEX "Review_customerId_idx" ON "Review"("customerId");

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Review_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
