export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";
import Link from "next/link";

const ACCENT_CARDS = [
  { bg: "#c4f23a", ink: "#0a0a0a" },
  { bg: "#ff6a2b", ink: "#0a0a0a" },
  { bg: "#7b4dff", ink: "#ffffff" },
  { bg: "#ff5da2", ink: "#0a0a0a" },
];

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF9EC", color: "#D97706" },
  paid:      { bg: "#EFF6FF", color: "#2563EB" },
  fulfilled: { bg: "#F0FDD4", color: "#2D6A00" },
  cancelled: { bg: "#FEF2F2", color: "#DC2626" },
};

export default async function DashboardPage() {
  const vendorJwt = await getVendorFromCookies();
  if (!vendorJwt) redirect("/admin/login");
  const vendor = vendorJwt;

  const [vendorRow, totalOrders, paidOrders, fulfilledOrders, totalAffiliates, revenueAgg, recentOrders] =
    await prisma.$transaction([
      prisma.vendor.findUnique({ where: { id: vendor.id }, select: { isApproved: true } }),
      prisma.order.count({ where: { vendorId: vendor.id } }),
      prisma.order.count({ where: { vendorId: vendor.id, status: "paid" } }),
      prisma.order.count({ where: { vendorId: vendor.id, status: "fulfilled" } }),
      prisma.affiliate.count({ where: { vendorId: vendor.id } }),
      prisma.order.aggregate({
        where: { vendorId: vendor.id, status: { in: ["paid", "fulfilled"] } },
        _sum: { vendorAmount: true, totalAmount: true },
      }),
      prisma.order.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, reference: true, buyerName: true, totalAmount: true, status: true, createdAt: true },
      }),
    ]);

  const statCards = [
    { label: "Total Revenue", value: formatNaira(revenueAgg._sum.totalAmount ?? 0), accent: ACCENT_CARDS[0] },
    { label: "Your Earnings", value: formatNaira(revenueAgg._sum.vendorAmount ?? 0), accent: ACCENT_CARDS[1] },
    { label: "Total Orders", value: String(totalOrders), accent: ACCENT_CARDS[2] },
    { label: "Affiliates", value: String(totalAffiliates), accent: ACCENT_CARDS[3] },
  ];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="eyebrow mb-2" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Store Dashboard</div>
        <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>
          {vendor.storeName}
        </h1>
        {!vendorRow?.isApproved && (
          <div className="inline-flex items-center gap-2 mt-3 rounded-2xl px-4 py-2 text-sm" style={{
            background: "#FEF9EC", border: "1px solid #D97706", color: "#D97706",
          }}>
            ⏳ Pending approval — your store will be visible once reviewed by Teaketer.
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-3xl p-5" style={{ background: s.accent.bg, color: s.accent.ink, minHeight: 130 }}>
            <div className="eyebrow mb-3" style={{ color: s.accent.ink === "#0a0a0a" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)", fontSize: 9 }}>
              {s.label}
            </div>
            <div className="font-display" style={{ fontSize: "clamp(1.4rem,2.5vw,1.9rem)", lineHeight: 1 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Paid orders", value: paidOrders },
          { label: "Fulfilled", value: fulfilledOrders },
          { label: "Pending", value: totalOrders - paidOrders - fulfilledOrders },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{
            background: "#fff", border: "1px solid #EBEBEB",
          }}>
            <div className="font-display text-2xl" style={{ color: "#1A1A1A" }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EBEBEB" }}>
          <div className="eyebrow" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent Orders</div>
          <Link href="/admin/orders" className="text-xs font-semibold hover:underline" style={{ color: "#1A1A1A" }}>
            View all →
          </Link>
        </div>
        <div>
          {recentOrders.length === 0 && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "#888" }}>
              No orders yet. Share your store link to get started.
            </div>
          )}
          {recentOrders.map((order) => {
            const chip = STATUS_CHIP[order.status] ?? { bg: "#F5F5F3", color: "#888" };
            return (
              <div key={order.id} className="px-5 py-3.5 flex items-center justify-between"
                style={{ borderBottom: "1px solid #EBEBEB" }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>{order.buyerName}</div>
                  <div className="text-xs font-mono-tk mt-0.5" style={{ color: "#888" }}>
                    {order.reference.slice(0, 22)}…
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={chip}>
                    {order.status}
                  </span>
                  <span className="font-display text-sm" style={{ color: "#1A1A1A" }}>
                    {formatNaira(order.totalAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
