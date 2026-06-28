"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Step = "offer" | "form" | "loading" | "done";

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

export default function BecomeAffiliateForm({
  orderReference,
  storeSlug,
  storeName,
}: {
  orderReference: string;
  storeSlug: string;
  storeName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("offer");
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [form, setForm] = useState({ password: "", accountNumber: "", bankCode: "", bankName: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (step === "form") {
      fetch("/api/banks").then((r) => r.json()).then((d) => setBanks(d.banks ?? []));
    }
  }, [step]);

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
    setStep("loading");
    try {
      const res = await fetch("/api/affiliates/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderReference, password: form.password, accountNumber: form.accountNumber, bankCode: form.bankCode, bankName: form.bankName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); setStep("form"); return; }
      setStep("done");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    }
  }

  const FieldLabel = ({ label }: { label: string }) => (
    <span style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>{label}</span>
  );

  if (step === "done") {
    return (
      <div className="rounded-3xl p-6 text-center" style={{ background: "#F0FDD4", border: "1px solid #C4F23A" }}>
        <div className="text-3xl mb-3">🎉</div>
        <div className="font-display text-lg mb-2" style={{ color: "#2D6A00" }}>You&apos;re an affiliate!</div>
        <p className="text-sm mb-5" style={{ color: "#2D6A00" }}>
          Share your unique link to earn commission on every sale you refer.
        </p>
        <a href={`/affiliate/${storeSlug}`}
          className="inline-block font-bold px-5 py-2.5 rounded-2xl transition-transform hover:scale-[1.02]"
          style={{ background: "#1A1A1A", color: "#c4f23a", textDecoration: "none" }}>
          Go to your dashboard →
        </a>
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="rounded-3xl p-8 text-center" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <div className="tk-spinner mx-auto mb-4" />
        <div className="text-sm" style={{ color: "#888" }}>Setting up your affiliate account…</div>
      </div>
    );
  }

  if (step === "offer") {
    return (
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <div className="text-3xl mb-3">💸</div>
        <div className="font-display text-xl mb-2" style={{ color: "#1A1A1A" }}>Earn by sharing {storeName}</div>
        <p className="text-sm mb-5" style={{ color: "#888" }}>
          Since you just bought from us, you can become an affiliate and earn commission every time someone buys through your link.
        </p>
        <button onClick={() => setStep("form")}
          className="font-bold px-5 py-2.5 rounded-2xl transition-transform hover:scale-[1.02]"
          style={{ background: "#c4f23a", color: "#1A1A1A", border: "none", borderRadius: 8 }}>
          Yes, I want to earn commission →
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
      <div className="font-display text-lg mb-1" style={{ color: "#1A1A1A" }}>Set up your affiliate account</div>
      <p className="text-sm mb-5" style={{ color: "#888" }}>We need a password and your bank account for payouts.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel label="Create a Password" />
          <input type="password" value={form.password} onChange={set("password")} required minLength={8}
            style={lightInput} placeholder="Min. 8 characters" />
        </div>
        <div>
          <FieldLabel label="Bank" />
          <select value={form.bankCode} onChange={set("bankCode")} required style={{ ...lightInput, appearance: "none" }}>
            <option value="">Select bank…</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel label="Account Number" />
          <input value={form.accountNumber} onChange={set("accountNumber")} required maxLength={10}
            style={lightInput} placeholder="0123456789" />
        </div>

        {error && (
          <div className="rounded-xl px-3 py-2.5 text-sm" style={{
            background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
          }}>{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => setStep("offer")}
            className="flex-1 font-semibold py-2.5 rounded-2xl text-sm transition-colors"
            style={{ background: "#F5F5F3", color: "#888", border: "1px solid #EBEBEB" }}>
            Cancel
          </button>
          <button type="submit"
            className="flex-1 font-bold py-2.5 rounded-2xl text-sm transition-transform hover:scale-[1.01]"
            style={{ background: "#1A1A1A", color: "#c4f23a", border: "none", borderRadius: 8 }}>
            Become an affiliate
          </button>
        </div>
      </form>
    </div>
  );
}
