import { NextRequest, NextResponse } from "next/server";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import { refundTransaction } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const vendor = await getVendorFromCookies();
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, vendorId: true, status: true, reference: true, totalAmount: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.vendorId !== vendor.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "paid") {
    return NextResponse.json(
      { error: `Cannot refund an order with status "${order.status}". Only paid orders can be refunded.` },
      { status: 422 }
    );
  }

  // Atomic claim: only succeeds if the order is still "paid", preventing double-refund
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, status: "paid" },
    data: { status: "refunding" },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Refund already in progress or order is no longer paid." }, { status: 409 });
  }

  let refundId: number;
  let refundStatus: string;

  try {
    const result = await refundTransaction({ transactionReference: order.reference });
    refundId = result.refundId;
    refundStatus = result.status;
  } catch (err) {
    // Paystack rejected the refund — safe to roll back, money never moved
    try {
      await prisma.order.update({ where: { id: order.id }, data: { status: "paid" } });
    } catch (rollbackErr) {
      console.error("[refund] rollback failed, order stuck in 'refunding':", rollbackErr);
    }
    const message = err instanceof Error ? err.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Paystack refund issued — persist final status regardless of DB errors
  try {
    await prisma.order.update({ where: { id: order.id }, data: { status: "refunded" } });
  } catch (dbErr) {
    console.error("[refund] DB update to 'refunded' failed after Paystack success. RefundId:", refundId, dbErr);
    // Do NOT roll back — Paystack already issued the refund
  }

  return NextResponse.json({ refundId, status: refundStatus });
}
