import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signVendorJwt, setVendorCookie, VENDOR_COOKIE_NAME } from "@/lib/vendorAuth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { slugify } from "@/lib/utils";
import { sendVendorRegistrationNotification } from "@/lib/email";

const ALLOWED_DOMAINS = ["instagram.com", "tiktok.com", "wa.me", "api.whatsapp.com", "youtube.com", "twitter.com", "x.com", "facebook.com", "linktr.ee"];

function isValidBusinessUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      ALLOWED_DOMAINS.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`vendor_register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, password, storeName, storeDescription, businessPageUrl } =
    (body as Record<string, unknown>);

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.includes("@") ||
    typeof password !== "string" || password.length < 8 ||
    typeof storeName !== "string" || !storeName.trim()
  ) {
    return NextResponse.json(
      { error: "Name, valid email, password (min 8 chars), and store name are required." },
      { status: 422 }
    );
  }

  const pageUrl = typeof businessPageUrl === "string" ? businessPageUrl.trim() : "";
  if (!pageUrl || !isValidBusinessUrl(pageUrl)) {
    return NextResponse.json(
      { error: "A valid Instagram, TikTok, or WhatsApp business page link is required." },
      { status: 422 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const baseSlug = slugify(storeName.trim());

  if (!baseSlug) {
    return NextResponse.json({ error: "Store name produces an invalid slug." }, { status: 422 });
  }

  // Unique slug: append incrementing suffix if taken
  let storeSlug = baseSlug;
  let suffix = 2;
  while (await prisma.vendor.findUnique({ where: { storeSlug } })) {
    storeSlug = `${baseSlug}-${suffix++}`;
  }

  const existing = await prisma.vendor.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const vendor = await prisma.vendor.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      storeName: storeName.trim(),
      storeSlug,
      storeDescription: typeof storeDescription === "string" ? storeDescription.trim() : "",
      businessPageUrl: pageUrl,
    },
  });

  // Fire notification email — non-blocking
  sendVendorRegistrationNotification({
    vendorName: vendor.name,
    storeName: vendor.storeName,
    email: vendor.email,
    businessPageUrl: vendor.businessPageUrl,
  }).catch(() => {});

  const token = await signVendorJwt({
    id: vendor.id,
    email: vendor.email,
    name: vendor.name,
    storeName: vendor.storeName,
    storeSlug: vendor.storeSlug,
  });

  const res = NextResponse.json(
    {
      ok: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        storeName: vendor.storeName,
        storeSlug: vendor.storeSlug,
        isApproved: vendor.isApproved,
      },
    },
    { status: 201 }
  );
  setVendorCookie(res as unknown as Response, token);
  return res;
}

export async function DELETE(req: NextRequest) {
  // Logout — just clear the cookie
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VENDOR_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
