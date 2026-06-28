import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

export async function GET(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    include: {
      variants: { orderBy: { createdAt: "asc" } },
      _count: { select: { orderItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, category, description, images, basePriceKobo, stockCount, variants } =
    (body as Record<string, unknown>);

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Product name is required." }, { status: 422 });
  }
  if (typeof basePriceKobo !== "number" || basePriceKobo < 0) {
    return NextResponse.json({ error: "Valid base price required." }, { status: 422 });
  }

  const variantData = Array.isArray(variants)
    ? (variants as Array<Record<string, unknown>>).map((v) => ({
        label: String(v.label ?? "").trim(),
        priceOffset: Number(v.priceOffset ?? 0),
        stockCount: Number(v.stockCount ?? 0),
        sku: typeof v.sku === "string" ? v.sku.trim() || null : null,
      })).filter((v) => v.label)
    : [];

  const product = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      name: name.trim(),
      category: typeof category === "string" ? category.trim() : "",
      description: typeof description === "string" ? description.trim() : "",
      images: typeof images === "string" ? images.trim() : "",
      basePriceKobo: Math.round(basePriceKobo),
      stockCount: variantData.length === 0 ? Math.max(0, Math.round(Number(stockCount ?? 0))) : 0,
      variants: variantData.length > 0 ? { create: variantData } : undefined,
    },
    include: { variants: true },
  });

  return NextResponse.json({ product }, { status: 201 });
}
