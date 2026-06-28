import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { generateAffiliateCode } from "@/lib/commerce";
import { createTransferRecipient, resolveAccountName } from "@/lib/paystack";
import { signAffiliateJwt } from "@/lib/affiliateAuth";

/** POST — buyer converts to affiliate post-purchase */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`aff_convert:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderReference, password, accountNumber, bankCode, bankName } =
    body as Record<string, unknown>;

  if (
    typeof orderReference !== "string" ||
    typeof password !== "string" || password.length < 8 ||
    typeof accountNumber !== "string" || !accountNumber.trim() ||
    typeof bankCode !== "string" || !bankCode.trim() ||
    typeof bankName !== "string" || !bankName.trim()
  ) {
    return NextResponse.json({ error: "Order reference, password (min 8 chars), and bank details required." }, { status: 422 });
  }

  const order = await prisma.order.findUnique({
    where: { reference: orderReference },
    include: { vendor: { select: { id: true, storeSlug: true, allowPublicAffiliate: true } } },
  });

  if (!order || order.status === "pending" || order.status === "cancelled") {
    return NextResponse.json({ error: "Valid paid order not found." }, { status: 404 });
  }

  const existing = await prisma.affiliate.findUnique({
    where: { vendorId_email: { vendorId: order.vendorId, email: order.buyerEmail } },
  });
  if (existing) {
    return NextResponse.json({ error: "You are already an affiliate for this store." }, { status: 409 });
  }

  let accountName: string;
  try {
    const resolved = await resolveAccountName({ accountNumber, bankCode });
    accountName = resolved.accountName;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not verify bank account.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  let recipientCode: string;
  try {
    const recipient = await createTransferRecipient({
      name: order.buyerName,
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
      vendorId: order.vendorId,
      name: order.buyerName,
      email: order.buyerEmail,
      passwordHash,
      code,
      source: "buyer",
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
    vendorId: order.vendorId,
    storeSlug: order.vendor.storeSlug,
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
