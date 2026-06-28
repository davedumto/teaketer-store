"use client";

import { useState } from "react";
import Image from "next/image";
import { formatNaira } from "@/lib/utils";

interface AffiliateData {
  name: string;
  email: string;
  code: string;
  source: string;
  bankName: string | null;
  accountNumber: string | null;
  vendor: { storeName: string; storeSlug: string; commissionBps: number };
}

interface Order {
  reference: string;
  buyerName: string;
  totalAmount: number;
  affiliateAmount: number;
  affiliatePaidOut: boolean;
  status: string;
  createdAt: Date;
}

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF9EC", color: "#D97706" },
  paid:      { bg: "#EFF6FF", color: "#2563EB" },
  fulfilled: { bg: "#F0FDD4", color: "#2D6A00" },
};

export default function AffiliateDashboardClient({
  affiliate,
  stats,
  recentOrders,
  referralUrl,
  storeSlug,
}: {
  affiliate: AffiliateData;
  stats: { totalOrders: number; totalEarned: number; totalReferredRevenue: number };
  recentOrders: Order[];
  referralUrl: string;
  storeSlug: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function logout() {
    await fetch("/api/affiliates/logout", { method: "POST" });
    window.location.href = `/affiliate/${storeSlug}/login`;
  }

  const commissionPct = (affiliate.vendor.commissionBps / 100).toFixed(0);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8" }}>
      {/* Header */}
      <header className="sticky top-0 z-10" style={{ background: "rgba(250,250,248,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #EBEBEB" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Teaketer" width={24} height={24} className="rounded-md" />
            <div className="font-display font-bold text-sm" style={{ color: "#1A1A1A" }}>{affiliate.vendor.storeName}</div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5F5F3", color: "#888" }}>Affiliate</span>
          </div>
          <button onClick={logout} className="text-sm font-semibold transition-colors hover:opacity-70" style={{ color: "#888" }}>
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* Hero card */}
        <div className="rounded-3xl p-6" style={{ background: "#1A1A1A", border: "1px solid rgba(196,242,58,0.2)" }}>
          <div className="eyebrow mb-1" style={{ color: "rgba(247,239,226,0.5)", fontSize: 9 }}>Welcome back</div>
          <div className="font-display text-xl" style={{ color: "#f7efe2" }}>{affiliate.name}</div>
          <div className="text-sm mt-1" style={{ color: "rgba(247,239,226,0.55)" }}>
            Code: <span className="font-mono-tk font-bold" style={{ color: "#c4f23a" }}>{affiliate.code}</span>
            {" · "}{commissionPct}% commission per sale
          </div>
        </div>

        {/* Referral link */}
        <div className="rounded-3xl p-5" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="eyebrow mb-3" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Your Referral Link</div>
          <div className="flex gap-2">
            <input readOnly value={referralUrl} className="flex-1 text-sm rounded-2xl px-3 py-2.5"
              style={{ background: "#FAFAF8", border: "1px solid #EBEBEB", color: "#1A1A1A" }} />
            <button onClick={copyLink}
              className="px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors"
              style={{ background: copied ? "#c4f23a" : "#1A1A1A", color: copied ? "#1A1A1A" : "#c4f23a", border: "none" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: "#888" }}>
            Share this link — you earn {commissionPct}% on every purchase made through it.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Referred Sales", value: String(stats.totalOrders) },
            { label: "Total Earned", value: formatNaira(stats.totalEarned) },
            { label: "Revenue Driven", value: formatNaira(stats.totalReferredRevenue) },
          ].map((s, i) => (
            <div key={s.label} className="rounded-3xl p-4 text-center"
              style={{ background: i === 1 ? "#1A1A1A" : "#fff", border: i === 1 ? "none" : "1px solid #EBEBEB" }}>
              <div className="font-display text-xl" style={{ color: i === 1 ? "#c4f23a" : "#1A1A1A" }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: i === 1 ? "rgba(247,239,226,0.5)" : "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bank info */}
        {affiliate.bankName && (
          <div className="rounded-3xl p-4 flex items-center gap-3" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-base"
              style={{ background: "#F0FDD4" }}>🏦</div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>{affiliate.bankName}</div>
              <div className="text-xs" style={{ color: "#888" }}>****{affiliate.accountNumber?.slice(-4)}</div>
            </div>
            <div className="ml-auto text-xs font-semibold" style={{ color: "#2D6A00" }}>Payout account</div>
          </div>
        )}

        {/* Referred orders */}
        <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #EBEBEB" }}>
            <div className="eyebrow" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Your Referred Orders</div>
          </div>
          <div>
            {recentOrders.length === 0 && (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "#888" }}>
                No referred orders yet. Start sharing your link!
              </div>
            )}
            {recentOrders.map((order) => {
              const chip = STATUS_CHIP[order.status] ?? { bg: "#F5F5F3", color: "#888" };
              return (
                <div key={order.reference} className="px-5 py-3.5 flex items-center justify-between"
                  style={{ borderBottom: "1px solid #EBEBEB" }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>{order.buyerName}</div>
                    <div className="text-xs font-mono-tk mt-0.5" style={{ color: "#888" }}>
                      {order.reference.slice(0, 18)}…
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: "#2D6A00" }}>+{formatNaira(order.affiliateAmount)}</div>
                      <div className="text-xs" style={{ color: "#888" }}>{formatNaira(order.totalAmount)} total</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={chip}>{order.status}</span>
                      {order.affiliatePaidOut && (
                        <span className="text-xs font-semibold" style={{ color: "#2D6A00" }}>paid out ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <a href={`/shop/${storeSlug}`} className="text-sm font-semibold hover:underline" style={{ color: "#888", textDecoration: "none" }}>
            Visit the store →
          </a>
        </div>
      </div>
    </div>
  );
}
