"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", storeName: "", storeDescription: "", businessPageUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!form.businessPageUrl.trim()) { setError("A business page link is required for verification."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); setLoading(false); return; }
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
    marginTop: 6,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    display: "block",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#FAFAF8", color: "#1A1A1A" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Teaketer" width={250} height={150} className="mx-auto mb-5 rounded-2xl" />
          <div style={{ ...labelStyle, textAlign: "center", marginBottom: 12 }}>Teaketer Store</div>
          <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(1.8rem,4vw,2.4rem)" }}>
            Open your store.
          </h1>
          <p className="mt-3 text-sm" style={{ color: "#888" }}>
            Set up in minutes. Start selling with affiliate commissions.
          </p>
        </div>

        <div className="rounded-3xl p-6 sm:p-8" style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12 }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span style={labelStyle}>Your Name</span>
                <input value={form.name} onChange={set("name")} required style={inputStyle} placeholder="Jane Doe" />
              </div>
              <div>
                <span style={labelStyle}>Email</span>
                <input type="email" value={form.email} onChange={set("email")} required style={inputStyle} placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <span style={labelStyle}>Password</span>
              <input type="password" value={form.password} onChange={set("password")} required minLength={8} style={inputStyle} placeholder="Min. 8 characters" />
            </div>

            {/* Store details */}
            <div style={{ borderTop: "1px solid #EBEBEB", paddingTop: 20 }}>
              <span style={{ ...labelStyle, marginBottom: 12, color: "#999" }}>Store details</span>
              <div className="space-y-4">
                <div>
                  <span style={labelStyle}>Store Name</span>
                  <input value={form.storeName} onChange={set("storeName")} required style={inputStyle} placeholder="My Awesome Store" />
                </div>
                <div>
                  <span style={labelStyle}>Description (optional)</span>
                  <textarea value={form.storeDescription} onChange={set("storeDescription")} rows={2}
                    style={{ ...inputStyle, resize: "none" }} placeholder="What do you sell?" />
                </div>
              </div>
            </div>

            {/* Verification */}
            <div style={{ borderTop: "1px solid #EBEBEB", paddingTop: 20 }}>
              <span style={{ ...labelStyle, marginBottom: 4, color: "#999" }}>Verification</span>
              <p className="text-xs mb-3" style={{ color: "#aaa", lineHeight: 1.6 }}>
                Paste your Instagram, TikTok, or WhatsApp catalogue link so we can verify you're a real seller.
              </p>
              <div>
                <span style={labelStyle}>Business Page Link <span style={{ color: "#DC2626" }}>*</span></span>
                <input
                  type="url"
                  value={form.businessPageUrl}
                  onChange={set("businessPageUrl")}
                  required
                  style={inputStyle}
                  placeholder="https://instagram.com/yourstore or https://wa.me/c/..."
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#F0FDD4", border: "1px solid #C4F23A", color: "#2D6A00" }}>
              ⏳ Your store will be reviewed within <strong>24 hours</strong>. You can add products while you wait.
            </div>

            <button type="submit" disabled={loading}
              className="w-full font-bold rounded-2xl py-4 transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#1A1A1A", color: "#fff", fontSize: 16, border: "none", borderRadius: 8 }}>
              {loading ? "Creating store…" : "Create my store →"}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "#888" }}>
            Already registered?{" "}
            <Link href="/admin/login" style={{ color: "#1A1A1A" }} className="hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
