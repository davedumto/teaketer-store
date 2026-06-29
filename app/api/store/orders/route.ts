import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { initializeTransaction } from "@/lib/paystack";
import { computeSplit } from "@/lib/commerce";
import { appUrl } from "@/lib/utils";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`store_checkout:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    storeSlug, buyerName, buyerEmail, buyerPhone,
    deliveryAddress, deliveryState, deliveryNote,
    items: rawItems, affiliateCode,
  } = body as Record<string, unknown>;

  if (
    typeof storeSlug !== "string" ||
    typeof buyerName !== "string" || !buyerName.trim() ||
    typeof buyerEmail !== "string" || !buyerEmail.includes("@") ||
    typeof buyerPhone !== "string" || !buyerPhone.trim() ||
    typeof deliveryAddress !== "string" || !deliveryAddress.trim() ||
    typeof deliveryState !== "string" || !NIGERIAN_STATES.includes(deliveryState)
  ) {
    return NextResponse.json({ error: "Invalid order data." }, { status: 422 });
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 422 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { storeSlug } });
  if (!vendor || !vendor.isApproved || !vendor.isActive) {
    return NextResponse.json({ error: "Store not found or unavailable." }, { status: 404 });
  }

  // Resolve affiliate
  let affiliate: { id: string } | null = null;
  if (typeof affiliateCode === "string" && affiliateCode.trim()) {
    affiliate = await prisma.affiliate.findFirst({
      where: { code: affiliateCode.toUpperCase(), vendorId: vendor.id, isActive: true },
      select: { id: true },
    });
  }

  // Resolve each cart item to DB product + variant, checking stock
  const resolvedItems: Array<{
    productId: string;
    variantId: string | null;
    productName: string;
    variantLabel: string;
    priceKobo: number;
    quantity: number;
  }> = [];

  for (const raw of rawItems as Array<Record<string, unknown>>) {
    const productId = String(raw.productId ?? "");
    const variantId = typeof raw.variantId === "string" ? raw.variantId : null;
    const quantity = Math.max(1, Math.round(Number(raw.quantity ?? 1)));

    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id, isActive: true },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product) {
      return NextResponse.json({ error: `Product not available.` }, { status: 422 });
    }

    let priceKobo = product.basePriceKobo;
    let variantLabel = "";

    // Normalise: treat the string "null" as no variant
    const resolvedVariantId = variantId && variantId !== "null" ? variantId : null;

    // If the product has variants and none was specified, auto-pick the first
    const effectiveVariantId = resolvedVariantId ?? (product.variants.length > 0 ? product.variants[0].id : null);

    if (effectiveVariantId) {
      const variant = product.variants.find((v) => v.id === effectiveVariantId);
      if (!variant) {
        return NextResponse.json({ error: `Variant not available.` }, { status: 422 });
      }
      if (variant.stockCount < quantity) {
        return NextResponse.json({
          error: `Not enough stock for ${product.name} (${variant.label}). Only ${variant.stockCount} left.`,
        }, { status: 422 });
      }
      priceKobo = product.basePriceKobo + variant.priceOffset;
      variantLabel = variant.label;
    } else {
      // No-variant product — check stockCount on the product itself
      if (product.stockCount < quantity) {
        return NextResponse.json({
          error: `Not enough stock for ${product.name}. Only ${product.stockCount} left.`,
        }, { status: 422 });
      }
    }

    resolvedItems.push({ productId, variantId: effectiveVariantId, productName: product.name, variantLabel, priceKobo, quantity });
  }

  const subtotalAmount = resolvedItems.reduce((sum, i) => sum + i.priceKobo * i.quantity, 0);

  // Look up delivery fee server-side — not from client
  const zones = await prisma.$queryRaw<{ feeKobo: number }[]>`
    SELECT feeKobo FROM DeliveryZone
    WHERE vendorId = ${vendor.id} AND state = ${deliveryState}
    LIMIT 1
  `;
  const deliveryFee = zones[0]?.feeKobo ?? 0;
  const totalAmount = subtotalAmount + deliveryFee;

  const { platformFeeAmount, affiliateAmount, vendorAmount } = computeSplit(
    totalAmount,
    vendor.platformFeeBps,
    vendor.commissionBps,
    !!affiliate
  );

  const reference = `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const order = await prisma.order.create({
    data: {
      vendorId: vendor.id,
      affiliateId: affiliate?.id ?? null,
      buyerName: buyerName.trim(),
      buyerEmail: buyerEmail.trim().toLowerCase(),
      buyerPhone: buyerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryState,
      deliveryNote: typeof deliveryNote === "string" ? deliveryNote.trim() : "",
      reference,
      totalAmount,
      platformFeeAmount,
      affiliateAmount,
      vendorAmount,
      items: {
        create: resolvedItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantLabel: i.variantLabel,
          priceKobo: i.priceKobo,
          quantity: i.quantity,
        })),
      },
    },
  });

  // Stamp deliveryFee using raw SQL since generated client may not include the new column yet
  if (deliveryFee > 0) {
    await prisma.$executeRaw`UPDATE "Order" SET deliveryFee = ${deliveryFee} WHERE id = ${order.id}`;
  }

  const callbackUrl = `${appUrl()}/shop/${storeSlug}/order/${reference}`;

  let authorizationUrl: string;
  try {
    const ps = await initializeTransaction({
      email: buyerEmail.trim().toLowerCase(),
      amount: totalAmount,
      reference,
      callbackUrl,
      metadata: { orderId: order.id, storeSlug, buyerName: buyerName.trim() },
      vendorFlatShare: vendor.paystackSubaccountCode
        ? {
            subaccountCode: vendor.paystackSubaccountCode,
            shareKobo: vendorAmount,
          }
        : undefined,
    });
    authorizationUrl = ps.authorizationUrl;
  } catch (err) {
    // Clean up the order if Paystack init fails
    await prisma.order.delete({ where: { id: order.id } });
    const msg = err instanceof Error ? err.message : "Payment initialization failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ authorizationUrl, reference, orderId: order.id }, { status: 201 });
}
