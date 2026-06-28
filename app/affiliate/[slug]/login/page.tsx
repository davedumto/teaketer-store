"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AffiliateLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed."); return; }
      router.push(`/affiliate/${slug}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#FAFAF8",
    border: "1.5px solid #E8E8E4",
    color: "#1A1A1A",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 15,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FAFAF8" }}>
      <div className="w-full max-w-sm">
        {/* Logo + badge */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.png" alt="Teaketer" width={40} height={40} className="rounded-xl" />
          </div>
          <div style={{ ...labelStyle, display: "inline-block", textAlign: "center", marginBottom: 12 }}>Teaketer Store</div>
          <h1 className="font-display text-2xl" style={{ color: "#1A1A1A" }}>Affiliate sign in</h1>
          <p className="text-sm mt-1" style={{ color: "#888" }}>Access your affiliate dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12 }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span style={labelStyle}>Email Address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                style={inputStyle}
                placeholder="you@example.com" />
            </div>
            <div>
              <span style={labelStyle}>Password</span>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  style={{ ...inputStyle, paddingRight: 48 }}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "#999", background: "transparent", border: "none", cursor: "pointer" }}>
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{
                background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-bold py-3.5 rounded-2xl transition-transform hover:scale-[1.01] disabled:opacity-50"
              style={{ background: "#1A1A1A", color: "#fff", border: "none", fontSize: 15, borderRadius: 8 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-4" style={{ color: "#888" }}>
            Not an affiliate yet?{" "}
            <Link href={`/shop/${slug}/affiliate`} className="font-semibold hover:underline" style={{ color: "#1A1A1A" }}>
              Join now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
