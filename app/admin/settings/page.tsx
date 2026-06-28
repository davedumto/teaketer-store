export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const vendor = await getVendorFromCookies();
  if (!vendor) redirect("/admin/login");

  const row = await prisma.vendor.findUnique({
    where: { id: vendor.id },
    select: {
      storeName: true,
      storeDescription: true,
      storeSlug: true,
      logoUrl: true,
      bannerUrl: true,
      allowPublicAffiliate: true,
      platformFeeBps: true,
      commissionBps: true,
      bankCode: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      isApproved: true,
      socialInstagram: true,
      socialFacebook: true,
      socialWhatsapp: true,
    },
  });

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-7">
        <div className="eyebrow mb-2" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Store Configuration</div>
        <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(1.6rem,3vw,2rem)" }}>Settings</h1>
      </div>
      <SettingsClient vendor={row!} />
    </div>
  );
}
