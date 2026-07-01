import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction, initializeTransaction } from "@/lib/paystack";
import { markOrderPaid, decrementStock } from "@/lib/commerce";
import { sendOrderConfirmationEmail, sendVendorOrderEmail } from "@/lib/email";
import { appUrl } from "@/lib/utils";
import { after } from "next/server";
import { getPusherServer, storeChannel, vendorChannel, EVENTS } from "@/lib/pusher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      vendor: { select: { storeName: true, logoUrl: true } },
      affiliate: { select: { id: true, code: true, name: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // If still pending, try to verify with Paystack (client-side poll)
  if (order.status === "pending") {
    try {
      const ps = await verifyTransaction(reference);
      if (ps.status === "success") {
        const won = await markOrderPaid(reference, new Date());
        if (won) {
          after(async () => {
            const fresh = await prisma.order.findUnique({
              where: { reference },
              include: {
                items: true,
                vendor: { select: { id: true, email: true, storeName: true, logoUrl: true, storeSlug: true } },
              },
            });
            if (!fresh) return;
            const stockUpdates = await decrementStock(fresh.items.map((i) => ({
              variantId: i.variantId,
              productId: i.productId,
              quantity: i.quantity,
            })));

            const pusher = getPusherServer();
            for (const update of stockUpdates) {
              await pusher.trigger(storeChannel(fresh.vendor.storeSlug), EVENTS.STOCK_UPDATED, update);
            }
            await pusher.trigger(vendorChannel(fresh.vendor.id), EVENTS.ORDER_PAID, {
              orderId: fresh.id,
              reference: fresh.reference,
              totalAmount: fresh.totalAmount,
              buyerName: fresh.buyerName,
            });

            await sendOrderConfirmationEmail({
              ...fresh,
              vendor: { storeName: fresh.vendor.storeName, logoUrl: fresh.vendor.logoUrl },
            });
            await sendVendorOrderEmail({
              reference: fresh.reference,
              buyerName: fresh.buyerName,
              buyerEmail: fresh.buyerEmail,
              buyerPhone: fresh.buyerPhone,
              deliveryAddress: fresh.deliveryAddress,
              deliveryState: fresh.deliveryState,
              totalAmount: fresh.totalAmount,
              items: fresh.items,
              vendorEmail: fresh.vendor.email,
              storeName: fresh.vendor.storeName,
              adminOrdersUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://teaketer.com"}/admin/orders`,
            });
          });
        }
        // Return updated order
        const updated = await prisma.order.findUnique({
          where: { reference },
          include: { items: true, vendor: { select: { storeName: true, logoUrl: true } } },
        });
        return NextResponse.json({ order: updated });
      }
    } catch {
      // Don't fail the GET — just return pending
    }
  }

  return NextResponse.json({ order });
}

// Re-initialise Paystack for a pending order (buyer closed widget without paying)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;

  const order = await prisma.order.findUnique({
    where: { reference },
    include: { vendor: { select: { storeSlug: true, paystackSubaccountCode: true } } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Order is already paid or cancelled." }, { status: 409 });
  }

  const callbackUrl = `${appUrl()}/shop/${order.vendor.storeSlug}/order/${reference}`;

  try {
    const ps = await initializeTransaction({
      email: order.buyerEmail,
      amount: order.totalAmount,
      reference,
      callbackUrl,
      metadata: { orderId: order.id, storeSlug: order.vendor.storeSlug, buyerName: order.buyerName },
      vendorFlatShare: order.vendor.paystackSubaccountCode
        ? { subaccountCode: order.vendor.paystackSubaccountCode, shareKobo: order.vendorAmount }
        : undefined,
    });
    return NextResponse.json({ authorizationUrl: ps.authorizationUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment initialization failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
