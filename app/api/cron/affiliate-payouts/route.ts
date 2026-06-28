import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initiateTransfer } from "@/lib/paystack";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all fulfilled orders with unpaid affiliate commissions
  const pendingOrders = await prisma.order.findMany({
    where: {
      status: "fulfilled",
      affiliatePaidOut: false,
      affiliateId: { not: null },
      affiliateAmount: { gt: 0 },
    },
    include: {
      affiliate: {
        select: {
          id: true,
          name: true,
          paystackRecipientCode: true,
          isActive: true,
        },
      },
    },
  });

  // Group by affiliateId to batch payouts
  const byAffiliate = new Map<string, {
    affiliateId: string;
    recipientCode: string;
    name: string;
    totalAmount: number;
    orderIds: string[];
  }>();

  for (const order of pendingOrders) {
    if (!order.affiliate || !order.affiliate.paystackRecipientCode || !order.affiliate.isActive) {
      continue;
    }
    const key = order.affiliate.id;
    const existing = byAffiliate.get(key);
    if (existing) {
      existing.totalAmount += order.affiliateAmount;
      existing.orderIds.push(order.id);
    } else {
      byAffiliate.set(key, {
        affiliateId: order.affiliate.id,
        recipientCode: order.affiliate.paystackRecipientCode,
        name: order.affiliate.name,
        totalAmount: order.affiliateAmount,
        orderIds: [order.id],
      });
    }
  }

  const results: Array<{ affiliateId: string; status: string; amount: number; error?: string }> = [];

  for (const [, aff] of byAffiliate) {
    const reference = `store_affpay_${aff.affiliateId}_${Math.floor(Date.now() / 86400000)}`;
    try {
      const transfer = await initiateTransfer({
        recipientCode: aff.recipientCode,
        amount: aff.totalAmount,
        reason: `Affiliate commission for ${aff.name}`,
        reference,
      });

      await prisma.$transaction([
        // Create payout record for each order
        ...aff.orderIds.map((orderId) =>
          prisma.affiliatePayout.upsert({
            where: { orderId },
            create: {
              affiliateId: aff.affiliateId,
              orderId,
              amount: pendingOrders.find((o) => o.id === orderId)?.affiliateAmount ?? 0,
              paystackTransferCode: transfer.transferCode,
              status: transfer.status === "success" ? "success" : "pending",
            },
            update: {
              paystackTransferCode: transfer.transferCode,
              status: transfer.status === "success" ? "success" : "pending",
            },
          })
        ),
        // Mark all qualifying orders as paid out
        prisma.order.updateMany({
          where: { id: { in: aff.orderIds } },
          data: { affiliatePaidOut: true },
        }),
      ]);

      results.push({ affiliateId: aff.affiliateId, status: transfer.status, amount: aff.totalAmount });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      results.push({ affiliateId: aff.affiliateId, status: "failed", amount: aff.totalAmount, error: msg });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
