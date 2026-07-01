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

  const { refundId, status } = await refundTransaction({ transactionReference: order.reference });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "refunded" },
  });

  return NextResponse.json({ refundId, status });
}
