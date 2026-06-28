export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontClient from "./StorefrontClient";

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;

  const vendor = await prisma.vendor.findUnique({
    where: { storeSlug: slug },
    select: {
      id: true,
      storeName: true,
      storeDescription: true,
      logoUrl: true,
      bannerUrl: true,
      isApproved: true,
      isActive: true,
      allowPublicAffiliate: true,
      storeSlug: true,
      socialInstagram: true,
      socialFacebook: true,
      socialWhatsapp: true,
    },
  });

  if (!vendor || !vendor.isApproved || !vendor.isActive) notFound();

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id, isActive: true },
    include: { variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return <StorefrontClient vendor={vendor} products={products} affiliateCode={ref ?? null} />;
}
