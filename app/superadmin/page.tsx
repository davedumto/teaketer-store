export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSuperadmin } from "@/lib/superadminAuth";
import { prisma } from "@/lib/prisma";
import { getSiteSetting } from "@/lib/siteSettings";
import { getPlatformCommissionBps } from "@/lib/commerce";
import VendorTable from "./VendorTable";
import AnalyticsDashboard from "./AnalyticsDashboard";
import SuperadminNav from "./SuperadminNav";
import SuperadminSettings from "./SuperadminSettings";

export default async function SuperadminPage() {
  const ok = await getSuperadmin();
  if (!ok) redirect("/superadmin/login");

  const notificationEmail = await getSiteSetting("admin_notification_email") ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? "";
  const commissionBps = String(await getPlatformCommissionBps());

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
        <SuperadminSettings initialEmail={notificationEmail} initialCommissionBps={commissionBps} />
        <AnalyticsDashboard />
      </div>
      <VendorTable initialVendors={enriched} />
    </div>
  );
}
