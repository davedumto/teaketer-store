import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { generateAffiliateCode } from "@/lib/commerce";
import { createTransferRecipient, resolveAccountName } from "@/lib/paystack";
import { signAffiliateJwt } from "@/lib/affiliateAuth";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`aff_signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { storeSlug, name, email, password, accountNumber, bankCode, bankName } =
    body as Record<string, unknown>;

  if (
    typeof storeSlug !== "string" ||
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.includes("@") ||
    typeof password !== "string" || password.length < 8 ||
    typeof accountNumber !== "string" || !accountNumber.trim() ||
    typeof bankCode !== "string" || !bankCode.trim() ||
    typeof bankName !== "string" || !bankName.trim()
  ) {
    return NextResponse.json({ error: "All fields including bank details are required." }, { status: 422 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { storeSlug } });
  if (!vendor || !vendor.isApproved || !vendor.isActive) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  if (!vendor.allowPublicAffiliate) {
    return NextResponse.json({ error: "This store is not accepting new affiliates." }, { status: 403 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.affiliate.findUnique({
    where: { vendorId_email: { vendorId: vendor.id, email: normalizedEmail } },
  });
  if (existing) {
    return NextResponse.json({ error: "You are already an affiliate for this store." }, { status: 409 });
  }

  // Verify bank account
  let accountName: string;
  try {
    const resolved = await resolveAccountName({ accountNumber, bankCode });
    accountName = resolved.accountName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not verify bank account.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Create Paystack transfer recipient
  let recipientCode: string;
  try {
    const recipient = await createTransferRecipient({
      name: name.trim(),
      accountNumber,
      bankCode,
    });
    recipientCode = recipient.recipientCode;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create payout recipient.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const code = await generateAffiliateCode();
  const passwordHash = await bcrypt.hash(password, 12);

  const affiliate = await prisma.affiliate.create({
    data: {
      vendorId: vendor.id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      code,
      source: "public",
      bankCode,
      bankName: bankName.trim(),
      accountNumber,
      accountName,
      paystackRecipientCode: recipientCode,
    },
  });

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
  }, { status: 201 });

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
