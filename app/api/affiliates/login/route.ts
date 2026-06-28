import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { signAffiliateJwt } from "@/lib/affiliateAuth";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`aff_login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storeSlug, email, password } = body as Record<string, unknown>;

  if (typeof storeSlug !== "string" || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Store slug, email and password required." }, { status: 422 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { storeSlug } });
  if (!vendor) return NextResponse.json({ error: "Store not found." }, { status: 404 });

  const affiliate = await prisma.affiliate.findUnique({
    where: { vendorId_email: { vendorId: vendor.id, email: email.trim().toLowerCase() } },
  });

  const hashToCheck = affiliate?.passwordHash ?? "$2a$12$invalidhashtopreventtimingatk";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!affiliate || !valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!affiliate.isActive) {
    return NextResponse.json({ error: "Your affiliate account has been deactivated." }, { status: 403 });
  }

  const token = await signAffiliateJwt({
    id: affiliate.id,
    email: affiliate.email,
    name: affiliate.name,
    vendorId: vendor.id,
    storeSlug: vendor.storeSlug,
    code: affiliate.code,
  });

  const res = NextResponse.json({
    ok: true,
    affiliate: { id: affiliate.id, name: affiliate.name, code: affiliate.code },
  });

  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("affiliate_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 604800,
    path: "/",
  });

  return res;
}
