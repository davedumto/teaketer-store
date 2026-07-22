import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest } from "@/lib/vendorAuth";

const MAX_LOCATION_LENGTH = 200;

type Zone = { state: string; feeKobo: number; freeDeliveryLocation: string | null };

export async function GET(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const zones = await prisma.$queryRaw<Zone[]>`
    SELECT state, feeKobo, freeDeliveryLocation FROM DeliveryZone
    WHERE vendorId = ${vendor.id}
    ORDER BY state ASC
  `;

  return NextResponse.json({ zones });
}

export async function PUT(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { zones } = body as { zones: Zone[] };

  if (!Array.isArray(zones)) {
    return NextResponse.json({ error: "zones must be an array" }, { status: 422 });
  }

  for (const z of zones) {
    if (typeof z.state !== "string" || !z.state.trim()) {
      return NextResponse.json({ error: "Each zone must have a state name" }, { status: 422 });
    }
    if (typeof z.feeKobo !== "number" || isNaN(z.feeKobo) || z.feeKobo < 0) {
      return NextResponse.json({ error: "feeKobo must be a non-negative number" }, { status: 422 });
    }
    if (z.freeDeliveryLocation != null && typeof z.freeDeliveryLocation !== "string") {
      return NextResponse.json({ error: "freeDeliveryLocation must be a string" }, { status: 422 });
    }
    if (typeof z.freeDeliveryLocation === "string" && z.freeDeliveryLocation.length > MAX_LOCATION_LENGTH) {
      return NextResponse.json({ error: `freeDeliveryLocation must be ${MAX_LOCATION_LENGTH} characters or fewer` }, { status: 422 });
    }
  }

  // Delete all existing zones for this vendor, then insert the new ones
  await prisma.$executeRaw`DELETE FROM DeliveryZone WHERE vendorId = ${vendor.id}`;

  for (const z of zones) {
    const id = `${vendor.id}_${z.state}`.replace(/\s+/g, "_").slice(0, 64);
    const location = z.freeDeliveryLocation?.trim() || null;
    await prisma.$executeRaw`
      INSERT OR REPLACE INTO DeliveryZone (id, vendorId, state, feeKobo, freeDeliveryLocation)
      VALUES (${id}, ${vendor.id}, ${z.state}, ${z.feeKobo}, ${location})
    `;
  }

  return NextResponse.json({ ok: true });
}
