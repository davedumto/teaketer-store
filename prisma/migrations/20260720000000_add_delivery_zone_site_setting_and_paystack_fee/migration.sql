-- Backfill columns/tables declared in schema.prisma but missing from the DB
-- (previously applied via ad-hoc raw SQL, never captured in a migration).
-- All statements are additive — no data loss.

-- AlterTable: Order.deliveryFee
ALTER TABLE "Order" ADD COLUMN "deliveryFee" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Order Paystack processing-fee columns
ALTER TABLE "Order" ADD COLUMN "paystackFeeAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "paystackFeeActualKobo" INTEGER;

-- CreateTable: DeliveryZone
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "feeKobo" INTEGER NOT NULL,
    CONSTRAINT "DeliveryZone_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DeliveryZone_vendorId_state_key" ON "DeliveryZone"("vendorId", "state");
CREATE INDEX "DeliveryZone_vendorId_idx" ON "DeliveryZone"("vendorId");

-- CreateTable: SiteSetting
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
