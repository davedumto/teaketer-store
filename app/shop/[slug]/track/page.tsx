export const dynamic = "force-dynamic";

import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrackForm from "./TrackForm";

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { storeSlug: slug },
    select: { storeName: true, storeSlug: true, logoUrl: true },
  });
  if (!vendor) notFound();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8F8F6", color: "#0D0D0D" }}>
      <header className="sticky top-0 z-10 bg-white" style={{ borderBottom: "1px solid #E8E8E4", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/logo.png" alt="Teaketer" width={120} height={29} style={{ height: 29, width: "auto" }} />
          </div>
          <a href={`/shop/${slug}`} className="text-sm font-medium" style={{ color: "#888880", textDecoration: "none" }}>
            ← Store
          </a>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#F0FDD4", border: "1.5px solid #C4F23A" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2D6A00" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "#0D0D0D" }}>Track your orders</h1>
            <p className="text-sm" style={{ color: "#888880", lineHeight: 1.6 }}>
              Enter the email you used at checkout. We'll send you a magic link to view your orders.
            </p>
          </div>
          <TrackForm storeSlug={slug} />
        </div>
      </div>
    </div>
  );
}
