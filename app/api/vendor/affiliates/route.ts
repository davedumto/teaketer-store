import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

export async function GET(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const affiliates = await prisma.affiliate.findMany({
    where: { vendorId: vendor.id },
    include: {
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ affiliates });
}
