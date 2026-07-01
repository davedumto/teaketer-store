import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVendorFromRequest, signVendorJwt, setVendorCookie } from "@/lib/vendorAuth";
import { resolveAccountName, createSubaccount, updateSubaccount } from "@/lib/paystack";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = body as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};

  if (typeof patch.storeName === "string" && patch.storeName.trim()) {
    updateData.storeName = patch.storeName.trim();
  }
  if (typeof patch.storeDescription === "string") {
    updateData.storeDescription = patch.storeDescription.trim();
  }
  if (typeof patch.logoUrl === "string") updateData.logoUrl = patch.logoUrl.trim();
  if (typeof patch.bannerUrl === "string") updateData.bannerUrl = patch.bannerUrl.trim();
  if (typeof patch.allowPublicAffiliate === "boolean") {
    updateData.allowPublicAffiliate = patch.allowPublicAffiliate;
  }
  if (typeof patch.commissionBps === "number" && !isNaN(patch.commissionBps)) {
    if (patch.commissionBps < 500) {
      return NextResponse.json({ error: "Minimum commission rate is 5%." }, { status: 422 });
    }
    if (patch.commissionBps > 5000) {
      return NextResponse.json({ error: "Maximum commission rate is 50%." }, { status: 422 });
    }
    updateData.commissionBps = patch.commissionBps;
  }
  if (typeof patch.socialInstagram === "string") updateData.socialInstagram = patch.socialInstagram.trim();
  if (typeof patch.socialFacebook === "string")  updateData.socialFacebook  = patch.socialFacebook.trim();
  if (typeof patch.socialWhatsapp === "string")  updateData.socialWhatsapp  = patch.socialWhatsapp.trim();

  // Bank details update — resolve account name then create/update Paystack subaccount
  if (typeof patch.accountNumber === "string" && typeof patch.bankCode === "string" && typeof patch.bankName === "string") {
    const accountNumber = patch.accountNumber.trim();
    const bankCode = patch.bankCode.trim();
    const bankName = patch.bankName.trim();

    let accountName: string;
    try {
      const resolved = await resolveAccountName({ accountNumber, bankCode });
      accountName = resolved.accountName;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resolve account";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    // Fetch current vendor to check if subaccount already exists
    const currentVendor = await prisma.vendor.findUnique({
      where: { id: vendor.id },
      select: { storeName: true, email: true, paystackSubaccountCode: true, platformFeeBps: true },
    });

    if (currentVendor?.paystackSubaccountCode) {
      // Subaccount exists — update bank details on Paystack
      try {
        await updateSubaccount({
          subaccountCode: currentVendor.paystackSubaccountCode,
          bankCode,
          accountNumber,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not update Paystack subaccount";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    } else {
      // No subaccount yet — create one
      try {
        const { subaccountCode } = await createSubaccount({
          businessName: currentVendor?.storeName ?? accountName,
          bankCode,
          accountNumber,
          platformFeePercent: (currentVendor?.platformFeeBps ?? 500) / 100,
          email: currentVendor?.email,
        });
        updateData.paystackSubaccountCode = subaccountCode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not create Paystack subaccount";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
    }

    updateData.accountNumber = accountNumber;
    updateData.bankCode = bankCode;
    updateData.bankName = bankName;
    updateData.accountName = accountName;
  }

  // Password change
  if (typeof patch.newPassword === "string" && patch.newPassword.length >= 8) {
    if (typeof patch.currentPassword !== "string") {
      return NextResponse.json({ error: "Current password required." }, { status: 422 });
    }
    const row = await prisma.vendor.findUnique({ where: { id: vendor.id }, select: { passwordHash: true } });
    const valid = await bcrypt.compare(patch.currentPassword as string, row?.passwordHash ?? "");
    if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 422 });
    updateData.passwordHash = await bcrypt.hash(patch.newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 422 });
  }

  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: updateData,
    select: {
      id: true, name: true, email: true, storeName: true, storeSlug: true,
      storeDescription: true, logoUrl: true, bannerUrl: true, isApproved: true,
      allowPublicAffiliate: true, bankCode: true, bankName: true, accountNumber: true, accountName: true,
      paystackSubaccountCode: true,
    },
  });

  // Re-issue JWT if storeName changed
  const newToken = await signVendorJwt({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    storeName: updated.storeName,
    storeSlug: updated.storeSlug,
  });

  const res = NextResponse.json({ vendor: updated });
  setVendorCookie(res as unknown as Response, newToken);
  return res;
}
