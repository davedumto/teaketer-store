import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/store/affiliate-lookup?slug=store-slug&code=CODE
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug")?.trim();
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!slug || !code) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: {
      code,
      isActive: true,
      vendor: { storeSlug: slug, isApproved: true, isActive: true },
    },
    select: { id: true },
  });

  return NextResponse.json({ valid: !!affiliate });
}
