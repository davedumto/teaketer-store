import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSubaccount } from "@/lib/paystack";

// Middleware already gates /api/superadmin/* — superadmin-only

export async function POST() {
  // Find all vendors with bank details but no Paystack subaccount yet
  const vendors = await prisma.vendor.findMany({
    where: {
      accountNumber: { not: null },
      bankCode: { not: null },
      paystackSubaccountCode: null,
    },
    select: {
      id: true,
      email: true,
      storeName: true,
      bankCode: true,
      accountNumber: true,
      platformFeeBps: true,
    },
  });

  const results: Array<{ vendorId: string; storeName: string; status: string; subaccountCode?: string; error?: string }> = [];

  for (const vendor of vendors) {
    try {
      const { subaccountCode } = await createSubaccount({
        businessName: vendor.storeName,
        bankCode: vendor.bankCode!,
        accountNumber: vendor.accountNumber!,
        platformFeePercent: vendor.platformFeeBps / 100,
        email: vendor.email,
      });

      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { paystackSubaccountCode: subaccountCode },
      });

      results.push({ vendorId: vendor.id, storeName: vendor.storeName, status: "ok", subaccountCode });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      results.push({ vendorId: vendor.id, storeName: vendor.storeName, status: "failed", error });
    }
  }

  return NextResponse.json({
    total: vendors.length,
    succeeded: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
