"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderFulfillButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function fulfill() {
    if (!confirm("Mark this order as fulfilled?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/fulfill`, { method: "POST" });
      if (res.ok) { setDone(true); router.refresh(); }
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span className="text-xs font-semibold" style={{ color: "#c4f23a" }}>✓ Fulfilled</span>;

  return (
    <button onClick={fulfill} disabled={loading}
      className="text-xs font-bold px-3 py-1.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-50"
      style={{ background: "rgba(196,242,58,0.12)", color: "#c4f23a", border: "1px solid rgba(196,242,58,0.3)" }}>
      {loading ? "…" : "Fulfill"}
    </button>
  );
}
