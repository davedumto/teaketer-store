import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paystack";
import { markOrderPaid, decrementStock } from "@/lib/commerce";
import { sendOrderConfirmationEmail, sendVendorOrderEmail } from "@/lib/email";
import { after } from "next/server";
import { getPusherServer, storeChannel, vendorChannel, EVENTS } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true }); // Acknowledge unhandled events
  }

  const data = event.data as Record<string, unknown>;
  const reference = String(data?.reference ?? "");

  // Only handle references from this app
  if (!reference.startsWith("ts_")) {
    return NextResponse.json({ ok: true });
  }

  const feesKobo = typeof data.fees === "number" ? data.fees : null;
  const won = await markOrderPaid(reference, new Date(), feesKobo);

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

      // Decrement stock and collect new counts
      const stockUpdates = await decrementStock(order.items.map((i) => ({
        variantId: i.variantId,
        productId: i.productId,
        quantity: i.quantity,
      })));

      // Push real-time events
      const pusher = getPusherServer();
      const slug = order.vendor.storeSlug;

      // Notify storefront clients of new stock levels
      for (const update of stockUpdates) {
        await pusher.trigger(storeChannel(slug), EVENTS.STOCK_UPDATED, update);
      }

      // Notify vendor dashboard of new paid order
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
