import { prisma } from "@/lib/prisma";

export function computeSplit(
  totalAmount: number,
  platformFeeBps: number,
  commissionBps: number,
  hasAffiliate: boolean
): {
  platformFeeAmount: number;
  affiliateAmount: number;
  vendorAmount: number;
} {
  const platformFeeAmount = Math.round(totalAmount * (platformFeeBps / 10000));
  const rawAffiliate = hasAffiliate
    ? Math.round(totalAmount * (commissionBps / 10000))
    : 0;
  const cappedAffiliate = Math.max(
    0,
    Math.min(rawAffiliate, totalAmount - platformFeeAmount)
  );
  return {
    platformFeeAmount,
    affiliateAmount: cappedAffiliate,
    vendorAmount: totalAmount - platformFeeAmount - cappedAffiliate,
  };
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export async function generateAffiliateCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const existing = await prisma.affiliate.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique affiliate code after 10 attempts");
}

/** Idempotent payment confirmation. Returns true if this call won the race. */
export async function markOrderPaid(
  reference: string,
  paidAt: Date
): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { reference, status: "pending" },
    data: { status: "paid", paidAt },
  });
  return result.count > 0;
}

export async function markOrderFulfilled(orderId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "fulfilled", fulfilledAt: new Date() },
  });
}

export interface StockUpdate {
  variantId: string;
  productId: string;
  newStock: number;
}

/** Decrement stock safely. Uses gte guard — silently no-ops if stock runs out.
 *  Returns the new stock count for each item that was updated.
 *  - Variant products: decrements ProductVariant.stockCount, variantId in update.
 *  - No-variant products: decrements Product.stockCount, variantId is null in update. */
export async function decrementStock(
  items: Array<{ variantId: string | null; productId: string; quantity: number }>
): Promise<StockUpdate[]> {
  const updates: StockUpdate[] = [];
  for (const item of items) {
    if (item.variantId) {
      // Variant-based product
      const result = await prisma.productVariant.updateMany({
        where: { id: item.variantId, stockCount: { gte: item.quantity } },
        data: { stockCount: { decrement: item.quantity } },
      });
      if (result.count > 0) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stockCount: true },
        });
        updates.push({
          variantId: item.variantId,
          productId: item.productId,
          newStock: variant?.stockCount ?? 0,
        });
      }
    } else {
      // No-variant product — decrement top-level stockCount
      const result = await prisma.product.updateMany({
        where: { id: item.productId, stockCount: { gte: item.quantity } },
        data: { stockCount: { decrement: item.quantity } },
      });
      if (result.count > 0) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { stockCount: true },
        });
        updates.push({
          variantId: item.productId, // keyed by productId so storefront can match it
          productId: item.productId,
          newStock: product?.stockCount ?? 0,
        });
      }
    }
  }
  return updates;
}
