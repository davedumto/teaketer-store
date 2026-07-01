export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import OrderFilterTabs from "./OrderFilterTabs";
import OrdersTable from "./OrdersTable";


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
            <OrdersTable orders={orders} />
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
