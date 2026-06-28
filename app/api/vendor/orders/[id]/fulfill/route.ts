import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";
import { markOrderFulfilled } from "@/lib/commerce";
import { getPusherServer, vendorChannel, EVENTS } from "@/lib/pusher";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findFirst({
    where: { id, vendorId: vendor.id },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "paid") {
    return NextResponse.json({ error: "Only paid orders can be fulfilled." }, { status: 422 });
  }

  await markOrderFulfilled(id);

  // Notify vendor dashboard in real-time
  const pusher = getPusherServer();
  await pusher.trigger(vendorChannel(vendor.id), EVENTS.ORDER_FULFILLED, { orderId: id });

  return NextResponse.json({ ok: true });
}
