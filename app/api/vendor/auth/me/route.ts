import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

export async function GET(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.vendor.findUnique({
    where: { id: vendor.id },
    select: {
      id: true,
      name: true,
      email: true,
      storeName: true,
      storeSlug: true,
      storeDescription: true,
      logoUrl: true,
      bannerUrl: true,
      isApproved: true,
      isActive: true,
      platformFeeBps: true,
      commissionBps: true,
      allowPublicAffiliate: true,
      bankCode: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      paystackSubaccountCode: true,
      createdAt: true,
    },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vendor: row });
}
