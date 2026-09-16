CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "brand" TEXT,
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "cardholderName" TEXT NOT NULL,
    "billingAddress" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "providerRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_methods_userId_idx"
ON "payment_methods"("userId");

CREATE INDEX "payment_methods_userId_isDefault_idx"
ON "payment_methods"("userId", "isDefault");

ALTER TABLE "payment_methods"
ADD CONSTRAINT "payment_methods_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods"
ON "payment_methods"
FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own payment methods"
ON "payment_methods"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own payment methods"
ON "payment_methods"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own payment methods"
ON "payment_methods"
FOR DELETE
USING (auth.uid()::text = "userId");
