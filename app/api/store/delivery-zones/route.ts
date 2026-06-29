import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Zone = { state: string; feeKobo: number };

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ zones: [] });

  const vendors = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM Vendor WHERE storeSlug = ${slug} LIMIT 1
  `;
  const vendor = vendors[0];
  if (!vendor) return NextResponse.json({ zones: [] });

  const zones = await prisma.$queryRaw<Zone[]>`
    SELECT state, feeKobo FROM DeliveryZone
    WHERE vendorId = ${vendor.id}
    ORDER BY state ASC
  `;

  return NextResponse.json({ zones });
}
