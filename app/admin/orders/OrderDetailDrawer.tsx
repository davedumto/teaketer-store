"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/utils";

interface OrderItem {
  id: string;
  productName: string;
  variantLabel: string;
  priceKobo: number;
  quantity: number;
}

export interface OrderDetail {
  id: string;
  reference: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryState: string;
  deliveryNote: string;
  totalAmount: number;
  createdAt: Date;
  items: OrderItem[];
  affiliate: { name: string; code: string } | null;
}

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF9EC", color: "#D97706" },
  paid:      { bg: "#EFF6FF", color: "#2563EB" },
  fulfilled: { bg: "#F0FDD4", color: "#2D6A00" },
  cancelled: { bg: "#FEF2F2", color: "#DC2626" },
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, fontSize: 13, color: "#1A1A1A", lineHeight: 1.5, wordBreak: "break-all" }}>
          {value || <span style={{ color: "#CCC" }}>—</span>}
        </div>
        {value && (
          <button
            onClick={copy}
            title="Copy"
            style={{
              flexShrink: 0, padding: "3px 10px", fontSize: 11, fontWeight: 700,
              border: "1px solid #EBEBEB", borderRadius: 6, cursor: "pointer",
              background: copied ? "#F0FDD4" : "#F5F5F3",
              color: copied ? "#2D6A00" : "#888",
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OrderDetailDrawer({
  order,
  onClose,
}: {
  order: OrderDetail;
  onClose: () => void;
}) {
  const chip = STATUS_CHIP[order.status] ?? { bg: "#F5F5F3", color: "#888" };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
        width: "min(480px, 100vw)",
        background: "#fff",
        borderLeft: "1px solid #EBEBEB",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px", borderBottom: "1px solid #EBEBEB",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#AAA", marginBottom: 4 }}>
              Order details
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "#1A1A1A", fontWeight: 700 }}>
              {order.reference}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100, ...chip }}>
              {order.status}
            </span>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: "1px solid #EBEBEB",
                background: "#F5F5F3", cursor: "pointer", fontSize: 18, color: "#888",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Section: Buyer */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F0F0EE" }}>
              Customer
            </div>
            <CopyField label="Full name" value={order.buyerName} />
            <CopyField label="Email" value={order.buyerEmail} />
            <CopyField label="Phone" value={order.buyerPhone} />
          </div>

          {/* Section: Delivery */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F0F0EE" }}>
              Delivery
            </div>
            <CopyField label="State" value={order.deliveryState} />
            <CopyField label="Address" value={order.deliveryAddress} />
            {order.deliveryNote && <CopyField label="Note" value={order.deliveryNote} />}
          </div>

          {/* Section: Items */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F0F0EE" }}>
              Items
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#FAFAF8", borderRadius: 10, border: "1px solid #EBEBEB" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                      {item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      qty {item.quantity} × {formatNaira(item.priceKobo)}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>
                    {formatNaira(item.priceKobo * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Payment */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F0F0EE" }}>
              Payment
            </div>
            <CopyField label="Reference" value={order.reference} />
            <CopyField label="Total" value={formatNaira(order.totalAmount)} />
            {order.affiliate && (
              <CopyField label="Affiliate code" value={order.affiliate.code} />
            )}
            <CopyField label="Date" value={new Date(order.createdAt).toLocaleString("en-NG")} />
          </div>
        </div>
      </div>
    </>
  );
}
