import React from "react";
import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";
import OrderActionButtons from "./OrderActionButtons";
import OrderFilterTabs from "./OrderFilterTabs";

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF9EC", color: "#D97706" },
  paid:      { bg: "#EFF6FF", color: "#2563EB" },
  fulfilled: { bg: "#F0FDD4", color: "#2D6A00" },
  cancelled: { bg: "#FEF2F2", color: "#DC2626" },
};


export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const vendor = await getVendorFromCookies();
  if (!vendor) redirect("/admin/login");

  const sp = await searchParams;
  const status = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const take = 20;
  const where = { vendorId: vendor.id, ...(status ? { status } : {}) };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { items: true, affiliate: { select: { name: true, code: true } } },
      orderBy: { createdAt: "desc" },
      take,
      skip: (page - 1) * take,
    }),
    prisma.order.count({ where }),
  ]);

  const pages = Math.ceil(total / take);

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <style>{`.order-row:hover { background: #FAFAF8; }`}</style>
      <div className="mb-7">
        <div className="eyebrow mb-2" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Order Management</div>
        <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(1.6rem,3vw,2rem)" }}>Orders</h1>
      </div>

      {/* Filter pills */}
      <OrderFilterTabs status={status} />

      <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #EBEBEB", background: "#F5F5F3" }}>
                {["Reference", "Buyer", "Items & Delivery", "Total", "Affiliate", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left eyebrow"
                    style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: "#888" }}>
                    No orders found.
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const chip = STATUS_CHIP[order.status] ?? { bg: "#F5F5F3", color: "#888" };
                return (
                  <React.Fragment key={order.id}>
                    <tr style={{ borderBottom: "1px solid #EBEBEB" }} className="order-row">
                      <td className="px-4 py-3.5 font-mono text-xs" style={{ color: "#1A1A1A" }}>
                        {order.reference.slice(0, 16)}…
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold" style={{ color: "#1A1A1A" }}>{order.buyerName}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#888" }}>{order.buyerEmail}</div>
                        <div className="text-xs" style={{ color: "#999" }}>{order.buyerPhone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div style={{ color: "#1A1A1A", fontSize: 13 }}>
                          {order.items.map((item) => (
                            <div key={item.id}>
                              {item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs mt-1" style={{ color: "#888" }}>
                          {order.deliveryState} · {order.deliveryAddress.slice(0, 40)}{order.deliveryAddress.length > 40 ? "…" : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-display text-sm" style={{ color: "#1A1A1A" }}>
                        {formatNaira(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5">
                        {order.affiliate ? (
                          <span className="text-xs font-mono" style={{ color: "#555" }}>{order.affiliate.code}</span>
                        ) : (
                          <span style={{ color: "#ccc" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={chip}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: "#888" }}>
                        {new Date(order.createdAt).toLocaleDateString("en-NG")}
                      </td>
                      <td className="px-4 py-3.5">
                        <OrderActionButtons orderId={order.id} status={order.status} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between text-sm"
            style={{ borderTop: "1px solid #EBEBEB", color: "#888" }}>
            <span>Page {page} of {pages} · {total} orders</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/admin/orders?${status ? `status=${status}&` : ""}page=${page - 1}`}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "#F5F5F3", color: "#1A1A1A", textDecoration: "none", border: "1px solid #EBEBEB" }}>
                  ← Prev
                </a>
              )}
              {page < pages && (
                <a href={`/admin/orders?${status ? `status=${status}&` : ""}page=${page + 1}`}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "#F5F5F3", color: "#1A1A1A", textDecoration: "none", border: "1px solid #EBEBEB" }}>
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
