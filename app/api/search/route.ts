import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [], stores: [] });
  }

  const [products, stores] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        vendor: { isApproved: true, isActive: true },
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { category: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        basePriceKobo: true,
        images: true,
        vendor: { select: { storeName: true, storeSlug: true } },
      },
      take: 24,
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.findMany({
      where: {
        isApproved: true,
        isActive: true,
        OR: [
          { storeName: { contains: q } },
          { storeDescription: { contains: q } },
        ],
      },
      select: {
        id: true,
        storeName: true,
        storeSlug: true,
        storeDescription: true,
        logoUrl: true,
        bannerUrl: true,
        _count: { select: { products: true } },
      },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ products, stores });
}
