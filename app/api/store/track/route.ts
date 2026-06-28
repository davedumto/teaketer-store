import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { SignJWT } from "jose";
import { appUrl } from "@/lib/utils";
import { sendTrackingEmail } from "@/lib/email";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET_VENDOR!);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`track:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email, storeSlug } = body;
  if (typeof email !== "string" || !email.includes("@") || typeof storeSlug !== "string") {
    return NextResponse.json({ error: "Valid email required." }, { status: 422 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { storeSlug } });
  if (!vendor) {
    console.error("[track] vendor not found for slug:", storeSlug);
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const orderCount = await prisma.order.count({
    where: { vendorId: vendor.id, buyerEmail: normalizedEmail },
  });

  console.log(`[track] email=${normalizedEmail} vendor=${vendor.id} orderCount=${orderCount}`);

  if (orderCount === 0) {
    return NextResponse.json({ error: "We couldn't find any orders tied to that email address." }, { status: 404 });
  }

  // Sign a short-lived token: email + storeSlug, 1 hour
  const token = await new SignJWT({ email: normalizedEmail, storeSlug })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret());

  // Use the request origin so the link always points at the right host/port
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const link = `${origin}/shop/${storeSlug}/orders?token=${token}`;

  console.log(`[track] sending magic link to ${normalizedEmail}: ${link}`);

  await sendTrackingEmail({ email: normalizedEmail, storeName: vendor.storeName, link });

  return NextResponse.json({ ok: true });
}
