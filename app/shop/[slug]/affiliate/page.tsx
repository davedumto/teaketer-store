import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AffiliateSignupClient from "./AffiliateSignupClient";

export default async function AffiliateSignupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { storeSlug: slug },
    select: { storeName: true, storeSlug: true, allowPublicAffiliate: true, isApproved: true, isActive: true },
  });

  if (!vendor || !vendor.isApproved || !vendor.isActive) notFound();
  if (!vendor.allowPublicAffiliate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">This store is not accepting new affiliates at this time.</p>
        </div>
      </div>
    );
  }

  return <AffiliateSignupClient storeName={vendor.storeName} storeSlug={slug} />;
}
