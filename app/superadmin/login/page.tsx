"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid PIN."); return; }
      router.push("/superadmin");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#FAFAF8" }}>
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Teaketer" width={56} height={56} className="mx-auto mb-4 rounded-2xl" />
          <div className="eyebrow mb-2" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Teaketer Store</div>
          <h1 className="font-display text-2xl" style={{ color: "#1A1A1A" }}>Superadmin</h1>
          <p className="text-sm mt-1" style={{ color: "#888" }}>Enter your PIN to continue</p>
        </div>

        <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12 }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="eyebrow block mb-1.5" style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>PIN</span>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                autoFocus
                className="w-full text-center text-2xl tracking-widest"
                placeholder="••••••"
                style={{
                  background: "#FAFAF8",
                  border: "1.5px solid #E8E8E4",
                  color: "#1A1A1A",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 22,
                  letterSpacing: "0.3em",
                  width: "100%",
                  outline: "none",
                }}
              />
            </div>

            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{
                background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-bold py-3.5 rounded-2xl transition-transform hover:scale-[1.01] disabled:opacity-50"
              style={{ background: "#c4f23a", color: "#1A1A1A", border: "none", fontSize: 15, borderRadius: 8 }}>
              {loading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
