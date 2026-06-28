import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperadmin } from "@/lib/superadminAuth";

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const ok = await getSuperadmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "30"; // days
  const days = Math.min(365, Math.max(7, parseInt(range) || 30));
  const since = daysAgo(days);

  const [paidOrders, allOrders, vendors, orderItems] = await Promise.all([
    // Revenue over time + delivery states
    prisma.order.findMany({
      where: { status: { in: ["paid", "fulfilled"] }, createdAt: { gte: since } },
      select: { createdAt: true, platformFeeAmount: true, totalAmount: true, deliveryState: true, vendorId: true, status: true },
    }),
    // Order status breakdown (all time)
    prisma.order.groupBy({ by: ["status"], _count: { status: true } }),
    // Vendor registrations over time
    prisma.vendor.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    // Product categories (from order items for sold count)
    prisma.orderItem.findMany({
      where: { order: { status: { in: ["paid", "fulfilled"] }, createdAt: { gte: since } } },
      select: { product: { select: { category: true } }, quantity: true },
    }),
  ]);

  // 1. Revenue over time — group by day
  const revenueByDay: Record<string, number> = {};
  for (const o of paidOrders) {
    const day = toYMD(new Date(o.createdAt));
    revenueByDay[day] = (revenueByDay[day] ?? 0) + o.platformFeeAmount;
  }
  const revenueTimeline = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  // 2. Orders by delivery state
  const stateMap: Record<string, number> = {};
  for (const o of paidOrders) {
    stateMap[o.deliveryState] = (stateMap[o.deliveryState] ?? 0) + 1;
  }
  const ordersByState = Object.entries(stateMap)
    .sort(([, a], [, b]) => b - a)
    .map(([state, count]) => ({ state, count }));

  // 3. Top stores by GMV
  const gmvMap: Record<string, number> = {};
  for (const o of paidOrders) {
    gmvMap[o.vendorId] = (gmvMap[o.vendorId] ?? 0) + o.totalAmount;
  }
  const topVendorIds = Object.entries(gmvMap).sort(([, a], [, b]) => b - a).slice(0, 10);
  const topVendorDetails = await prisma.vendor.findMany({
    where: { id: { in: topVendorIds.map(([id]) => id) } },
    select: { id: true, storeName: true },
  });
  const nameMap = new Map(topVendorDetails.map((v) => [v.id, v.storeName]));
  const topStores = topVendorIds.map(([id, gmv]) => ({ store: nameMap.get(id) ?? id, gmv }));

  // 4. Order status breakdown
  const statusBreakdown = allOrders.map((r) => ({ status: r.status, count: r._count.status }));

  // 5. Vendor registrations over time
  const regByDay: Record<string, number> = {};
  for (const v of vendors) {
    const day = toYMD(new Date(v.createdAt));
    regByDay[day] = (regByDay[day] ?? 0) + 1;
  }
  const vendorTimeline = Object.entries(regByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // 6. Top product categories by units sold
  const catMap: Record<string, number> = {};
  for (const item of orderItems) {
    const cat = item.product?.category?.trim() || "Uncategorised";
    catMap[cat] = (catMap[cat] ?? 0) + item.quantity;
  }
  const topCategories = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .map(([category, units]) => ({ category, units }));

  return NextResponse.json({
    revenueTimeline,
    ordersByState,
    topStores,
    statusBreakdown,
    vendorTimeline,
    topCategories,
  });
}
