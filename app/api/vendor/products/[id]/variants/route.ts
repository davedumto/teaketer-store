import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findFirst({
    where: { id: productId, vendorId: vendor.id },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { label, priceOffset, stockCount, sku } = body as Record<string, unknown>;

  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ error: "Variant label required." }, { status: 422 });
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      label: label.trim(),
      priceOffset: typeof priceOffset === "number" ? Math.round(priceOffset) : 0,
      stockCount: typeof stockCount === "number" ? Math.max(0, Math.round(stockCount)) : 0,
      sku: typeof sku === "string" ? sku.trim() || null : null,
    },
  });

  return NextResponse.json({ variant }, { status: 201 });
}
