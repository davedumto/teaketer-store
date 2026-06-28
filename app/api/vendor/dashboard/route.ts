import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

export async function GET(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalOrders,
    paidOrders,
    fulfilledOrders,
    totalAffiliates,
    revenueAgg,
    recentOrders,
  ] = await prisma.$transaction([
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
      take: 5,
      select: {
        id: true,
        reference: true,
        buyerName: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalOrders,
      paidOrders,
      fulfilledOrders,
      totalAffiliates,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
      vendorEarnings: revenueAgg._sum.vendorAmount ?? 0,
    },
    recentOrders,
  });
}
