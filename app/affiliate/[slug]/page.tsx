export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAffiliateFromCookies } from "@/lib/affiliateAuth";
import { prisma } from "@/lib/prisma";
import { formatNaira, appUrl } from "@/lib/utils";
import AffiliateDashboardClient from "./AffiliateDashboardClient";

export default async function AffiliateDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const aff = await getAffiliateFromCookies();

  if (!aff || aff.storeSlug !== slug) {
    redirect(`/affiliate/${slug}/login`);
  }

  const [affiliate, orderStats, recentOrders] = await prisma.$transaction([
    prisma.affiliate.findUnique({
      where: { id: aff.id },
      select: {
        name: true,
        email: true,
        code: true,
        source: true,
        bankName: true,
        accountNumber: true,
        vendor: { select: { storeName: true, storeSlug: true, commissionBps: true } },
      },
    }),
    prisma.order.aggregate({
      where: { affiliateId: aff.id, status: { in: ["paid", "fulfilled"] } },
      _sum: { affiliateAmount: true, totalAmount: true },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { affiliateId: aff.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        reference: true,
        buyerName: true,
        totalAmount: true,
        affiliateAmount: true,
        affiliatePaidOut: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  if (!affiliate) redirect(`/affiliate/${slug}/login`);

  const referralUrl = `${appUrl()}/shop/${slug}?ref=${affiliate.code}`;

  return (
    <AffiliateDashboardClient
      affiliate={affiliate}
      stats={{
        totalOrders: orderStats._count.id,
        totalEarned: orderStats._sum.affiliateAmount ?? 0,
        totalReferredRevenue: orderStats._sum.totalAmount ?? 0,
      }}
      recentOrders={recentOrders}
      referralUrl={referralUrl}
      storeSlug={slug}
    />
  );
}
