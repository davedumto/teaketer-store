import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

async function getOwnedProduct(req: NextRequest, id: string) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return { vendor: null, product: null };
  const product = await prisma.product.findFirst({
    where: { id, vendorId: vendor.id },
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });
  return { vendor, product };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vendor, product } = await getOwnedProduct(req, id);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vendor, product } = await getOwnedProduct(req, id);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;

  // Upsert variants if provided
  if (Array.isArray(patch.variants)) {
    const incoming = patch.variants as Array<{
      id?: string; label: string; priceOffset: number; stockCount: number; sku: string;
    }>;

    // Delete variants not in the incoming list
    const incomingIds = incoming.filter((v) => v.id).map((v) => v.id!);
    await prisma.productVariant.deleteMany({
      where: { productId: id, id: { notIn: incomingIds } },
    });

    // Upsert each variant
    for (const v of incoming) {
      if (v.id) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: {
            label: v.label.trim(),
            priceOffset: Math.round(v.priceOffset),
            stockCount: Math.max(0, Math.round(v.stockCount)),
            sku: v.sku?.trim() ?? "",
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: id,
            label: v.label.trim(),
            priceOffset: Math.round(v.priceOffset),
            stockCount: Math.max(0, Math.round(v.stockCount)),
            sku: v.sku?.trim() ?? "",
          },
        });
      }
    }
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(typeof patch.name === "string" && { name: patch.name.trim() }),
      ...(typeof patch.category === "string" && { category: patch.category.trim() }),
      ...(typeof patch.description === "string" && { description: patch.description.trim() }),
      ...(typeof patch.images === "string" && { images: patch.images.trim() }),
      ...(typeof patch.basePriceKobo === "number" && { basePriceKobo: Math.round(patch.basePriceKobo) }),
      ...(typeof patch.stockCount === "number" && { stockCount: Math.max(0, Math.round(patch.stockCount)) }),
      ...(typeof patch.isActive === "boolean" && { isActive: patch.isActive }),
    },
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vendor, product } = await getOwnedProduct(req, id);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
