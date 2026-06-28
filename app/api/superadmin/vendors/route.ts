import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const SECRET = new TextEncoder().encode(process.env.SUPERADMIN_SECRET!);

async function auth(req: NextRequest) {
  const token = req.cookies.get("sa_token")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "superadmin";
  } catch {
    return false;
  }
}

// PATCH /api/superadmin/vendors  { vendorId, isApproved?, isActive? }
export async function PATCH(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vendorId, isApproved, isActive } = await req.json() as {
    vendorId: string;
    isApproved?: boolean;
    isActive?: boolean;
  };

  if (!vendorId) return NextResponse.json({ error: "vendorId required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof isApproved === "boolean") data.isApproved = isApproved;
  if (typeof isActive === "boolean") data.isActive = isActive;

  const vendor = await prisma.vendor.update({ where: { id: vendorId }, data });
  return NextResponse.json({ ok: true, vendor });
}

// DELETE /api/superadmin/vendors  { vendorId }
export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vendorId } = await req.json() as { vendorId: string };
  if (!vendorId) return NextResponse.json({ error: "vendorId required" }, { status: 400 });

  await prisma.vendor.delete({ where: { id: vendorId } });
  return NextResponse.json({ ok: true });
}
