import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { id: productId, variantId } = await params;
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify vendor owns the product
  const product = await prisma.product.findFirst({ where: { id: productId, vendorId: vendor.id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;
  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      ...(typeof patch.label === "string" && { label: patch.label.trim() }),
      ...(typeof patch.priceOffset === "number" && { priceOffset: Math.round(patch.priceOffset) }),
      ...(typeof patch.stockCount === "number" && { stockCount: Math.max(0, Math.round(patch.stockCount)) }),
      ...(typeof patch.sku === "string" && { sku: patch.sku.trim() || null }),
      ...(typeof patch.isActive === "boolean" && { isActive: patch.isActive }),
    },
  });

  return NextResponse.json({ variant: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { id: productId, variantId } = await params;
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await prisma.product.findFirst({ where: { id: productId, vendorId: vendor.id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.productVariant.deleteMany({ where: { id: variantId, productId } });
  return NextResponse.json({ ok: true });
}
