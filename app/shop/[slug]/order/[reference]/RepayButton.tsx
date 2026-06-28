"use client";

import { useState } from "react";

export default function RepayButton({ reference }: { reference: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRepay() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/store/orders/${reference}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not restart payment."); return; }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626", marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button
        onClick={handleRepay}
        disabled={loading}
        style={{
          width: "100%", padding: "14px", background: loading ? "#888" : "#1A1A1A",
          color: "white", border: "none", borderRadius: 8,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        }}
      >
        {loading ? "Redirecting…" : "Complete payment →"}
      </button>
      <p style={{ textAlign: "center", fontSize: 11, color: "#BBB", margin: "8px 0 0" }}>
        Your order details are saved. Click above to return to Paystack and complete your payment.
      </p>
    </div>
  );
}
