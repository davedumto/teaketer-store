export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";
import OrderStatusPoller from "./OrderStatusPoller";
import RepayButton from "./RepayButton";
import BecomeAffiliateForm from "./BecomeAffiliateForm";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;

  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      vendor: { select: { storeName: true, storeSlug: true, allowPublicAffiliate: true, logoUrl: true } },
      affiliate: { select: { id: true } },
    },
  });

  if (!order || order.vendor.storeSlug !== slug) notFound();

  const isAlreadyAffiliate = !!(await prisma.affiliate.findUnique({
    where: { vendorId_email: { vendorId: order.vendorId, email: order.buyerEmail } },
    select: { id: true },
  }));

  const isPaid = order.status === "paid" || order.status === "fulfilled";

  return (
    <div className="min-h-screen" style={{ background: "#F8F8F6", color: "#0D0D0D" }}>
      <header className="sticky top-0 z-10 bg-white" style={{ borderBottom: "1px solid #E8E8E4", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.png" alt="Teaketer" width={120} height={29} style={{ height: 29, width: "auto" }} />
          </div>
          <a href={`/shop/${slug}`} className="text-sm font-medium" style={{ color: "#888880", textDecoration: "none" }}>
            ← Store
          </a>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Status hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: isPaid ? "#F0FDD4" : "#FFFBEB", border: isPaid ? "1.5px solid #C4F23A" : "1.5px solid #FCD34D" }}>
            {isPaid
              ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D6A00" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            }
          </div>
          <h1 className="font-display text-2xl" style={{ color: "#0D0D0D" }}>
            {order.status === "pending" ? "Awaiting payment…" : "Order Confirmed!"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#888880" }}>{order.vendor.storeName}</p>
        </div>

        {order.status === "pending" && (
          <>
            <OrderStatusPoller reference={reference} slug={slug} />
            <RepayButton reference={reference} />
          </>
        )}

        {/* Order card */}
        <div className="rounded-2xl overflow-hidden mb-4 bg-white" style={{ border: "1px solid #E8E8E4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E8E4" }}>
            <div className="eyebrow mb-0.5" style={{ color: "#AAAAА6", fontSize: 9 }}>Order Reference</div>
            <div className="font-mono text-sm font-bold" style={{ color: "#0D0D0D" }}>{reference}</div>
          </div>

          <div className="px-5 py-4" style={{ borderBottom: "1px solid #E8E8E4" }}>
            <div className="eyebrow mb-2" style={{ color: "#AAAAА6", fontSize: 9 }}>Items</div>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span style={{ color: "#555550" }}>{item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}</span>
                  <span className="font-semibold" style={{ color: "#0D0D0D" }}>{formatNaira(item.priceKobo * item.quantity)}</span>
                </div>
              ))}
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span style={{ color: "#555550" }}>Delivery</span>
                <span className="font-semibold" style={{ color: "#0D0D0D" }}>{formatNaira(order.deliveryFee)}</span>
              </div>
            )}
            {order.paystackFeeAmount > 0 && (
              <div className="flex justify-between text-sm mt-2">
                <span style={{ color: "#555550" }}>Paystack processing fee</span>
                <span className="font-semibold" style={{ color: "#0D0D0D" }}>{formatNaira(order.paystackFeeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-display font-bold text-base mt-3 pt-3" style={{ borderTop: "1px solid #E8E8E4" }}>
              <span style={{ color: "#0D0D0D" }}>Total Paid</span>
              <span style={{ color: "#0D0D0D" }}>{formatNaira(order.totalAmount + order.paystackFeeAmount)}</span>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="eyebrow mb-1" style={{ color: "#AAAAА6", fontSize: 9 }}>Delivery to</div>
            <div className="font-semibold text-sm" style={{ color: "#0D0D0D" }}>{order.buyerName}</div>
            <div className="text-sm mt-0.5" style={{ color: "#888880" }}>{order.deliveryAddress}, {order.deliveryState}</div>
          </div>
        </div>

        {isPaid && !isAlreadyAffiliate && !order.affiliateId && (
          <BecomeAffiliateForm orderReference={reference} storeSlug={slug} storeName={order.vendor.storeName} />
        )}
      </div>
    </div>
  );
}
