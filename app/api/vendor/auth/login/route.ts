import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signVendorJwt, setVendorCookie, VENDOR_COOKIE_NAME } from "@/lib/vendorAuth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`vendor_login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = (body as Record<string, unknown>);

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required." }, { status: 422 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  const hashToCheck = vendor?.passwordHash ?? "$2a$12$invalidhashtopreventtimingattack";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!vendor || !valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!vendor.isActive) {
    return NextResponse.json({ error: "Your account has been deactivated." }, { status: 403 });
  }

  const token = await signVendorJwt({
    id: vendor.id,
    email: vendor.email,
    name: vendor.name,
    storeName: vendor.storeName,
    storeSlug: vendor.storeSlug,
  });

  const res = NextResponse.json({
    ok: true,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      storeName: vendor.storeName,
      storeSlug: vendor.storeSlug,
      isApproved: vendor.isApproved,
    },
  });
  setVendorCookie(res as unknown as Response, token);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VENDOR_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
