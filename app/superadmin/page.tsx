import { redirect } from "next/navigation";
import { getSuperadmin } from "@/lib/superadminAuth";
import { prisma } from "@/lib/prisma";
import VendorTable from "./VendorTable";
import AnalyticsDashboard from "./AnalyticsDashboard";
import SuperadminNav from "./SuperadminNav";

export default async function SuperadminPage() {
  const ok = await getSuperadmin();
  if (!ok) redirect("/superadmin/login");

  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      storeName: true,
      storeSlug: true,
      businessPageUrl: true,
      isApproved: true,
      isActive: true,
      createdAt: true,
      _count: { select: { products: true, orders: true } },
    },
  });

  // Aggregate revenue per vendor
  const revenues = await prisma.order.groupBy({
    by: ["vendorId"],
    where: { status: { in: ["paid", "fulfilled"] } },
    _sum: { totalAmount: true },
  });
  const revenueMap = new Map(revenues.map((r) => [r.vendorId, r._sum.totalAmount ?? 0]));

  const enriched = vendors.map((v) => ({
    ...v,
    _sum: { totalAmount: revenueMap.get(v.id) ?? 0 },
  }));

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8" }}>
      <SuperadminNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 0" }}>
        <AnalyticsDashboard />
      </div>
      <VendorTable initialVendors={enriched} />
    </div>
  );
}
