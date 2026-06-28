"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AffiliateLoginLanding() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
    if (!clean) { setError("Please enter a store name or link."); return; }
    router.push(`/affiliate/${clean}/login`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#FAFAF8" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Teaketer" width={120} height={30} className="mx-auto mb-6" style={{ objectFit: "contain" }} />
          <h1 className="font-display text-2xl" style={{ color: "#1A1A1A" }}>Affiliate login</h1>
          <p className="mt-2 text-sm" style={{ color: "#888" }}>
            Enter the store name you promote to continue.
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#888", display: "block", marginBottom: 6 }}>
                Store slug or URL
              </label>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setError(""); }}
                placeholder="e.g. lip-gloss-store"
                required
                style={{ width: "100%", background: "#FAFAF8", border: "1.5px solid #E8E8E4", color: "#1A1A1A", borderRadius: 8, padding: "12px 16px", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const }}
              />
              <p className="mt-1.5 text-xs" style={{ color: "#aaa" }}>
                Find it in the store URL: teaketer.com/shop/<strong>store-name</strong>
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "#1A1A1A", color: "#fff", border: "none", fontSize: 15 }}
            >
              Continue →
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: "#888" }}>
          Not an affiliate yet?{" "}
          <a href="/" style={{ color: "#1A1A1A", fontWeight: 600 }}>Browse stores</a>
        </p>
      </div>
    </div>
  );
}
