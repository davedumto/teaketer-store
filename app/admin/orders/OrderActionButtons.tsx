"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderActionButtons({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
      setConfirmMarkPaid(false);
    }
  }

  async function fulfill() {
    setLoading("fulfilled");
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/fulfill`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const btn = (
    label: string,
    action: () => void,
    key: string,
    variant: "primary" | "default" | "danger" = "default"
  ) => {
    const styles: Record<string, React.CSSProperties> = {
      primary: { background: "#F0FDD4", color: "#2D6A00", border: "1px solid #C4F23A" },
      default: { background: "#F5F5F3", color: "#555", border: "1px solid #EBEBEB" },
      danger:  { background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" },
    };
    return (
      <button
        key={key}
        onClick={action}
        disabled={loading !== null}
        className="text-xs font-bold px-3 py-1.5 rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-40 whitespace-nowrap"
        style={styles[variant]}
      >
        {loading === key ? "…" : label}
      </button>
    );
  };

  if (confirmMarkPaid) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <p style={{ fontSize: 11, color: "#D97706", fontWeight: 600, textAlign: "right", margin: 0 }}>
          Confirm manual payment?
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {btn("Yes, mark paid", () => updateStatus("paid"), "paid", "primary")}
          {btn("Cancel", () => setConfirmMarkPaid(false), "cancel", "default")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {status === "pending" && (
        <>
          {btn("Mark paid", () => setConfirmMarkPaid(true), "paid", "primary")}
          {btn("Cancel", () => updateStatus("cancelled"), "cancelled", "danger")}
        </>
      )}
      {status === "paid" && (
        <>
          {btn("Mark fulfilled", () => fulfill(), "fulfilled", "primary")}
          {btn("Cancel", () => updateStatus("cancelled"), "cancelled", "danger")}
        </>
      )}
      {status === "fulfilled" && (
        <span className="text-xs font-semibold" style={{ color: "#2D6A00" }}>✓ Done</span>
      )}
      {status === "cancelled" && (
        <span className="text-xs" style={{ color: "#BBB" }}>Cancelled</span>
      )}
    </div>
  );
}
