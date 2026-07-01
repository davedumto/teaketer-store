import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderPaid, decrementStock } from "@/lib/commerce";
import { sendOrderConfirmationEmail, sendVendorOrderEmail } from "@/lib/email";
import { after } from "next/server";
import { getPusherServer, storeChannel, vendorChannel, EVENTS } from "@/lib/pusher";

// Receives forwarded Paystack charge.success events from the play-circle webhook router.
// Protected by a shared secret so only the router can call it.

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-forward-secret");
  if (!process.env.WEBHOOK_FORWARD_SECRET || secret !== process.env.WEBHOOK_FORWARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const reference = String(event.data?.reference ?? "");
  if (!reference.startsWith("ts_")) {
    return NextResponse.json({ ok: true });
  }

  const won = await markOrderPaid(reference, new Date());

  if (won) {
    after(async () => {
      const order = await prisma.order.findUnique({
        where: { reference },
        include: {
          items: true,
          vendor: { select: { id: true, email: true, storeName: true, logoUrl: true, storeSlug: true } },
        },
      });
      if (!order) return;

      const stockUpdates = await decrementStock(order.items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        quantity: i.quantity,
      })));

      const pusher = getPusherServer();
      const slug = order.vendor.storeSlug;

      for (const update of stockUpdates) {
        await pusher.trigger(storeChannel(slug), EVENTS.STOCK_UPDATED, update);
      }

      await pusher.trigger(vendorChannel(order.vendor.id), EVENTS.ORDER_PAID, {
        orderId: order.id,
        reference: order.reference,
        totalAmount: order.totalAmount,
        buyerName: order.buyerName,
      });

      await sendOrderConfirmationEmail({
        ...order,
        vendor: { storeName: order.vendor.storeName, logoUrl: order.vendor.logoUrl },
      });

      await sendVendorOrderEmail({
        reference: order.reference,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        buyerPhone: order.buyerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryState: order.deliveryState,
        totalAmount: order.totalAmount,
        items: order.items,
        vendorEmail: order.vendor.email,
        storeName: order.vendor.storeName,
        adminOrdersUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://teaketer.com"}/admin/orders`,
      });
    });
  }

  return NextResponse.json({ ok: true });
}
