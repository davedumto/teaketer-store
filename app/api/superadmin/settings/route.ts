import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Middleware already gates /api/superadmin/* — no auth check needed here

export async function GET() {
  const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
    SELECT key, value FROM SiteSetting
  `;
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, value } = body as { key: string; value: string };

  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ error: "key is required" }, { status: 422 });
  }
  if (typeof value !== "string") {
    return NextResponse.json({ error: "value must be a string" }, { status: 422 });
  }

  await prisma.$executeRaw`
    INSERT OR REPLACE INTO SiteSetting (key, value) VALUES (${key.trim()}, ${value.trim()})
  `;

  return NextResponse.json({ ok: true });
}
