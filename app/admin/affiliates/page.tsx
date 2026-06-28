export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";

export default async function AffiliatesPage() {
  const vendor = await getVendorFromCookies();
  if (!vendor) redirect("/admin/login");

  const affiliates = await prisma.affiliate.findMany({
    where: { vendorId: vendor.id },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  });

  const earningsMap = await prisma.order.groupBy({
    by: ["affiliateId"],
    where: { vendorId: vendor.id, status: { in: ["paid", "fulfilled"] }, affiliateId: { not: null } },
    _sum: { affiliateAmount: true },
  });
  const earnings = new Map(
    earningsMap.filter((e) => e.affiliateId).map((e) => [e.affiliateId!, e._sum.affiliateAmount ?? 0])
  );

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <style>{`.aff-row:hover { background: #FAFAF8; }`}</style>

      <div className="mb-7">
        <div className="eyebrow mb-2" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Affiliate Network</div>
        <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(1.6rem,3vw,2rem)" }}>Affiliates</h1>
      </div>

      <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #EBEBEB", background: "#F5F5F3" }}>
                {["Affiliate", "Code", "Source", "Orders", "Earned", "Bank", "Status", "Joined"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left eyebrow"
                    style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: "#888" }}>
                    No affiliates yet. They'll appear here once buyers or the public sign up.
                  </td>
                </tr>
              )}
              {affiliates.map((aff) => (
                <tr key={aff.id} className="aff-row" style={{ borderBottom: "1px solid #EBEBEB" }}>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold" style={{ color: "#1A1A1A" }}>{aff.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#888" }}>{aff.email}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs font-bold" style={{ color: "#1A1A1A" }}>{aff.code}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
                      background: aff.source === "buyer" ? "#EFF6FF" : "#F0FDD4",
                      color: aff.source === "buyer" ? "#2563EB" : "#2D6A00",
                    }}>
                      {aff.source}
                    </span>
                  </td>
                  <td className="px-4 py-3.5" style={{ color: "#1A1A1A" }}>{aff._count.orders}</td>
                  <td className="px-4 py-3.5 font-display text-sm" style={{ color: "#1A1A1A" }}>
                    {formatNaira(earnings.get(aff.id) ?? 0)}
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: "#888" }}>
                    {aff.bankName ? `${aff.bankName} ****${aff.accountNumber?.slice(-4)}` : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
                      background: aff.isActive ? "#F0FDD4" : "#FEF2F2",
                      color: aff.isActive ? "#2D6A00" : "#DC2626",
                    }}>
                      {aff.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: "#888" }}>
                    {new Date(aff.createdAt).toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
