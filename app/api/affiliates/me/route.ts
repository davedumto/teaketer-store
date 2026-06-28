import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAffiliateFromRequest } from "@/lib/affiliateAuth";

export async function GET(req: NextRequest) {
  const aff = await getAffiliateFromRequest(req);
  if (!aff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [affiliate, orderStats] = await prisma.$transaction([
    prisma.affiliate.findUnique({
      where: { id: aff.id },
      select: {
        id: true, name: true, email: true, code: true, source: true,
        bankName: true, accountNumber: true, accountName: true, createdAt: true,
        vendor: { select: { storeName: true, storeSlug: true } },
      },
    }),
    prisma.order.aggregate({
      where: { affiliateId: aff.id, status: { in: ["paid", "fulfilled"] } },
      _sum: { affiliateAmount: true },
      _count: { id: true },
    }),
  ]);

  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const unpaidPayout = await prisma.order.aggregate({
    where: { affiliateId: aff.id, status: "fulfilled", affiliatePaidOut: false },
    _sum: { affiliateAmount: true },
  });

  return NextResponse.json({
    affiliate,
    stats: {
      totalOrders: orderStats._count.id,
      totalEarned: orderStats._sum.affiliateAmount ?? 0,
      pendingPayout: unpaidPayout._sum.affiliateAmount ?? 0,
    },
  });
}
