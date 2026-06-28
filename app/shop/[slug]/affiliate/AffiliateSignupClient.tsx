"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const lightInput: React.CSSProperties = {
  width: "100%",
  background: "#FAFAF8",
  border: "1.5px solid #E8E8E4",
  color: "#1A1A1A",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
};

export default function AffiliateSignupClient({
  storeName,
  storeSlug,
}: {
  storeName: string;
  storeSlug: string;
}) {
  const router = useRouter();
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", accountNumber: "", bankCode: "", bankName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/banks").then((r) => r.json()).then((d) => setBanks(d.banks ?? []));
  }, []);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value;
      if (field === "bankCode") {
        const bank = banks.find((b) => b.code === val);
        setForm((f) => ({ ...f, bankCode: val, bankName: bank?.name ?? "" }));
      } else {
        setForm((f) => ({ ...f, [field]: val }));
      }
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/affiliates/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, storeSlug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Signup failed."); return; }
      router.push(`/affiliate/${storeSlug}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const FieldLabel = ({ label }: { label: string }) => (
    <span style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>{label}</span>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "#FAFAF8" }}>
      <div className="w-full max-w-md">
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.png" alt="Teaketer" width={36} height={36} className="rounded-xl" />
          </div>
          <div style={{ color: "#1A1A1A", background: "#F0FDD4", display: "inline-block", padding: "2px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
            {storeName} · Affiliates
          </div>
          <h1 className="font-display text-2xl mt-3" style={{ color: "#1A1A1A" }}>Join the program</h1>
          <p className="text-sm mt-1" style={{ color: "#888" }}>Earn commission by referring customers</p>
        </div>

        <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 12 }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel label="Full Name" />
                <input value={form.name} onChange={set("name")} required style={lightInput} placeholder="Jane Doe" />
              </div>
              <div>
                <FieldLabel label="Email" />
                <input type="email" value={form.email} onChange={set("email")} required style={lightInput} placeholder="jane@example.com" />
              </div>
            </div>

            <div>
              <FieldLabel label="Password" />
              <input type="password" value={form.password} onChange={set("password")} required minLength={8}
                style={lightInput} placeholder="Min. 8 characters" />
            </div>

            <div className="pt-2" style={{ borderTop: "1px solid #EBEBEB" }}>
              <div style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Bank details for commission payouts</div>
              <div className="space-y-3">
                <div>
                  <FieldLabel label="Bank" />
                  <select value={form.bankCode} onChange={set("bankCode")} required style={{ ...lightInput, appearance: "none" }}>
                    <option value="">Select bank…</option>
                    {banks.map((b, i) => <option key={`${b.code}-${i}`} value={b.code}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Account Number" />
                  <input value={form.accountNumber} onChange={set("accountNumber")} required maxLength={10}
                    style={lightInput} placeholder="0123456789" />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-3 py-2.5 text-sm" style={{
                background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-bold py-3.5 rounded-2xl transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{ background: "#1A1A1A", color: "#fff", border: "none", fontSize: 15, borderRadius: 8 }}>
              {loading ? "Setting up…" : "Join as affiliate"}
            </button>
          </form>

          <p className="text-center text-sm mt-4" style={{ color: "#888" }}>
            Already an affiliate?{" "}
            <a href={`/affiliate/${storeSlug}/login`} className="font-semibold hover:underline" style={{ color: "#1A1A1A" }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
