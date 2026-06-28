import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

const VALID_STATUSES = ["pending", "paid", "fulfilled", "cancelled"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findFirst({ where: { id, vendorId: vendor.id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(status === "paid" && !order.paidAt ? { paidAt: new Date() } : {}),
      ...(status === "fulfilled" && !order.fulfilledAt ? { fulfilledAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ order: updated });
}
