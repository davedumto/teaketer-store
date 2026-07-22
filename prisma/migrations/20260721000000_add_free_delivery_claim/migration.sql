-- Vendor-specified free-delivery landmark per state, and the buyer's
-- self-declared claim of qualifying for it. Both additive.

-- AlterTable: DeliveryZone.freeDeliveryLocation
ALTER TABLE "DeliveryZone" ADD COLUMN "freeDeliveryLocation" TEXT;

-- AlterTable: Order.freeDeliveryClaimed
ALTER TABLE "Order" ADD COLUMN "freeDeliveryClaimed" BOOLEAN NOT NULL DEFAULT false;
