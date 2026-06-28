import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET_VENDOR!);

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "Awaiting payment", bg: "#FFFBEB", color: "#D97706" },
  paid:      { label: "Paid · Being prepared", bg: "#EFF6FF", color: "#2563EB" },
  fulfilled: { label: "Delivered", bg: "#F0FDD4", color: "#2D6A00" },
  cancelled: { label: "Cancelled", bg: "#FEF2F2", color: "#DC2626" },
};

export default async function BuyerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token) redirect(`/shop/${slug}/track`);

  let email: string;
  let tokenSlug: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    email = payload.email as string;
    tokenSlug = payload.storeSlug as string;
  } catch {
    redirect(`/shop/${slug}/track`);
  }

  if (tokenSlug !== slug) redirect(`/shop/${slug}/track`);

  const vendor = await prisma.vendor.findUnique({
    where: { storeSlug: slug },
    select: { id: true, storeName: true, storeSlug: true, logoUrl: true },
  });
  if (!vendor) notFound();

  const orders = await prisma.order.findMany({
    where: { buyerEmail: email, vendorId: vendor.id },
    include: { items: { include: { product: { select: { images: true } } } } },
    orderBy: { createdAt: "desc" },
  });

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

      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-7">
          <h1 className="font-display text-2xl font-bold" style={{ color: "#0D0D0D" }}>Your Orders</h1>
          <p className="text-sm mt-1" style={{ color: "#888880" }}>{email}</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-white" style={{ border: "1px solid #E8E8E4" }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#F4F4F0" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#BBBBB6" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
            </div>
            <div className="font-display font-bold text-lg mb-1" style={{ color: "#0D0D0D" }}>No orders yet</div>
            <p className="text-sm mb-5" style={{ color: "#888880" }}>When you place an order it'll show up here.</p>
            <a href={`/shop/${slug}`} className="inline-block text-sm font-bold px-5 py-2.5 rounded-2xl"
              style={{ background: "#C4F23A", color: "#0D0D0D", textDecoration: "none" }}>
              Shop now
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const s = STATUS_LABEL[order.status] ?? { label: order.status, bg: "#F4F4F0", color: "#555550" };
              return (
                <a key={order.id} href={`/shop/${slug}/order/${order.reference}`}
                  style={{ textDecoration: "none", display: "block" }}>
                  <div className="rounded-2xl p-5 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ border: "1px solid #E8E8E4", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-mono text-xs font-semibold" style={{ color: "#0D0D0D" }}>{order.reference}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#888880" }}>
                          {new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items.map((item) => {
                        const imgUrl = item.product?.images?.split(",").filter(Boolean)[0] ?? null;
                        return (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden"
                              style={{ background: "#F4F4F0", border: "1px solid #E8E8E4" }}>
                              {imgUrl
                                ? <img src={imgUrl} alt={item.productName} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: "#0D0D0D" }}>
                                {item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""}
                              </div>
                              <div className="text-xs" style={{ color: "#888880" }}>× {item.quantity}</div>
                            </div>
                            <span className="flex-shrink-0 text-sm font-semibold" style={{ color: "#0D0D0D" }}>
                              {formatNaira(item.priceKobo * item.quantity)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center pt-3" style={{ borderTop: "1px solid #E8E8E4" }}>
                      <span className="text-xs" style={{ color: "#888880" }}>Total</span>
                      <span className="font-display font-bold" style={{ color: "#0D0D0D" }}>{formatNaira(order.totalAmount)}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
