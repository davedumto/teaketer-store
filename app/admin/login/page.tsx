"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed."); setLoading(false); return; }
      router.replace("/admin/dashboard");
    } catch {
      setError("Network error. Please try again.");
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
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#FAFAF8", color: "#1A1A1A" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Teaketer" width={52} height={52} className="mx-auto mb-5 rounded-2xl" />
          <div className="eyebrow mb-3" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Teaketer Store</div>
          <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(2rem,5vw,2.6rem)" }}>
            Vendor login.
          </h1>
          <p className="mt-3 text-sm" style={{ color: "#888" }}>
            Sign in to manage your store.
          </p>
        </div>

        <div className="rounded-3xl p-6 sm:p-8" style={{
          background: "#fff",
          border: "1px solid #EBEBEB",
          borderRadius: 12,
        }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <span className="eyebrow block" style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Email</span>
              <input
                type="email" required autoFocus
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{ ...inputStyle, marginTop: 6 }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <span className="eyebrow block" style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Password</span>
              <div className="relative" style={{ marginTop: 6 }}>
                <input
                  type={showPassword ? "text" : "password"} required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ ...inputStyle, paddingRight: 48 }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#999", background: "transparent", border: "none", cursor: "pointer" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#DC2626",
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-bold rounded-2xl py-4 transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: "#1A1A1A", color: "#fff", fontSize: 16, border: "none", borderRadius: 8 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "#888" }}>
            Don't have a store?{" "}
            <Link href="/admin/register" style={{ color: "#1A1A1A" }} className="hover:underline font-semibold">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
