"use client";

import { useState } from "react";

export default function TrackForm({ storeSlug }: { storeSlug: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/store/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, storeSlug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    background: "#F8F8F6",
    border: "1.5px solid #E8E8E4",
    color: "#0D0D0D",
    borderRadius: 14,
    padding: "13px 16px",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
  };

  if (sent) {
    return (
      <div className="rounded-3xl p-8 text-center" style={{ background: "#F0FDD4", border: "1.5px solid #C4F23A" }}>
        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#C4F23A" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div className="font-display font-bold text-lg mb-2" style={{ color: "#0D0D0D" }}>Check your inbox</div>
        <p className="text-sm" style={{ color: "#555550", lineHeight: 1.6 }}>
          If we found orders for <strong style={{ color: "#0D0D0D" }}>{email}</strong>, we've sent a link to view them. Check your spam folder too.
        </p>
        <button onClick={() => { setSent(false); setEmail(""); }}
          className="mt-5 text-sm font-semibold" style={{ color: "#888880", background: "none", border: "none", cursor: "pointer" }}>
          Try a different email →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jane@example.com"
        style={inp}
      />

      {error && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}
        className="w-full font-bold py-3.5 rounded-2xl transition-all hover:scale-[1.01] disabled:opacity-50"
        style={{ background: "#0D0D0D", color: "#C4F23A", border: "none", fontSize: 15 }}>
        {loading ? "Sending…" : "Send me my orders"}
      </button>
    </form>
  );
}
