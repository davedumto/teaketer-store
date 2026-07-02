export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontClient from "./StorefrontClient";

// Open Graph / SEO metadata for a shared store link. The og:image itself is
// produced by the co-located opengraph-image.tsx route (Next auto-injects the
// og:image / twitter:image tags), so we deliberately do NOT set openGraph.images
// here — doing both would emit duplicate tags and confuse scrapers.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { storeSlug: slug },
    select: { storeName: true, storeDescription: true, isApproved: true, isActive: true },
  });

  // Mirror the page's visibility gate so hidden stores don't leak a real preview.
  if (!vendor || !vendor.isApproved || !vendor.isActive) {
    return { title: "Store not found" };
  }

  const name = vendor.storeName || "Teaketer Store";
  const rawDescription = vendor.storeDescription || `Shop ${name} on Teaketer Store.`;
  // Keep meta strings within platform display limits.
  const title = name.length > 60 ? `${name.slice(0, 57)}…` : name;
  const description =
    rawDescription.length > 160 ? `${rawDescription.slice(0, 157)}…` : rawDescription;

  // Canonical URL is derived from the slug only — never the affiliate ?ref= param,
  // which would fragment scraper caches and split SEO signal across affiliates.
  const canonical = `/shop/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: "Teaketer Store",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
