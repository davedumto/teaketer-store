import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/paystack";
import { getSiteSetting } from "@/lib/siteSettings";
import { calculatePaystackFee } from "@/lib/paystackFee";

const DEFAULT_PLATFORM_COMMISSION_BPS = 500; // 5% — used if superadmin hasn't set one yet

/** Reads the global platform commission rate (bps) set by the superadmin. */
export async function getPlatformCommissionBps(): Promise<number> {
  const raw = await getSiteSetting("platform_commission_bps");
  if (raw === null) return DEFAULT_PLATFORM_COMMISSION_BPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) {
    return DEFAULT_PLATFORM_COMMISSION_BPS;
  }
  return parsed;
}

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

/**
 * Resolves the delivery fee for a checkout given the vendor's zone config and
 * the buyer's self-declared free-delivery claim. The waiver only applies if
 * the vendor actually configured a free-delivery landmark for this zone —
 * a buyer claiming free delivery on a zone with no such offer still pays the
 * normal fee.
 */
export function resolveDeliveryFee(
  zone: { feeKobo: number; freeDeliveryLocation: string | null } | null,
  claimsFreeDelivery: boolean
): number {
  if (!zone) return 0;
  const offersFreeDelivery = !!zone.freeDeliveryLocation?.trim();
  if (claimsFreeDelivery && offersFreeDelivery) return 0;
  return zone.feeKobo;
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
  paidAt: Date,
  paystackFeeActualKobo?: number | null
): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { reference, status: "pending" },
    data: {
      status: "paid",
      paidAt,
      ...(paystackFeeActualKobo != null ? { paystackFeeActualKobo } : {}),
    },
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

/**
 * Initializes (or re-initializes) a Paystack transaction for an order,
 * charging the buyer totalAmount + paystackFeeAmount and routing vendorAmount
 * to the vendor's subaccount. Used by both initial checkout and the repay
 * flow — paystackFeeAmount must be the value already stamped on the order at
 * creation time, never recomputed, so a retried payment charges the same
 * total the buyer originally saw.
 */
export async function initializeOrderCheckout(params: {
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  totalAmount: number;
  paystackFeeAmount: number;
  vendorAmount: number;
  vendorSubaccountCode: string | null;
}): Promise<{ authorizationUrl: string; accessCode: string }> {
  return initializeTransaction({
    email: params.email,
    amount: params.totalAmount + params.paystackFeeAmount,
    reference: params.reference,
    callbackUrl: params.callbackUrl,
    metadata: params.metadata,
    vendorFlatShare: params.vendorSubaccountCode
      ? { subaccountCode: params.vendorSubaccountCode, shareKobo: params.vendorAmount }
      : undefined,
  });
}
