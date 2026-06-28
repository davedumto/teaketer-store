"use client";

import { formatNaira } from "@/lib/utils";
import type { CartItem } from "./StorefrontClient";

export default function CartDrawer({
  isOpen, onClose, cart, onUpdateCart, onCheckout,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCart: (items: CartItem[]) => void;
  onCheckout: () => void;
}) {
  const total = cart.reduce((s, i) => s + i.priceKobo * i.quantity, 0);

  function updateQty(idx: number, delta: number) {
    const updated = cart
      .map((item, i) => {
        if (i !== idx) return item;
        const newQty = item.quantity + delta;
        // Clamp between 0 (removes item) and available stock
        const clamped = Math.min(Math.max(0, newQty), item.stockCount);
        return { ...item, quantity: clamped };
      })
      .filter((item) => item.quantity > 0);
    onUpdateCart(updated);
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(3px)" }} />

      {/* Panel */}
      <div style={{ width: "min(380px, 100vw)", display: "flex", flexDirection: "column", height: "100%", background: "white", boxShadow: "-12px 0 48px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", letterSpacing: "-0.01em" }}>Your Bag</div>
            {cart.length > 0 && <div style={{ fontSize: 12, color: "#999", marginTop: 1 }}>{cart.reduce((s, i) => s + i.quantity, 0)} item{cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}</div>}
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #EBEBEB", background: "white", cursor: "pointer", fontSize: 18, color: "#888", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }} className="no-sb">
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: "#F5F5F3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Your bag is empty</div>
              <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>Add something you love</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 14, paddingBottom: 20, borderBottom: "1px solid #F0F0EE" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.3 }}>{item.productName}</div>
                    {item.variantLabel && <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>{item.variantLabel}</div>}
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginTop: 6 }}>{formatNaira(item.priceKobo)}</div>
                  </div>
                  {/* Qty controls */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>{formatNaira(item.priceKobo * item.quantity)}</div>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #E0E0E0", borderRadius: 6, overflow: "hidden" }}>
                      <button onClick={() => updateQty(idx, -1)}
                        style={{ width: 36, height: 36, border: "none", background: "white", cursor: "pointer", fontSize: 14, color: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ width: 24, textAlign: "center", fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>{item.quantity}</span>
                      <button onClick={() => updateQty(idx, 1)}
                        disabled={item.quantity >= item.stockCount}
                        style={{ width: 36, height: 36, border: "none", background: "white", cursor: item.quantity >= item.stockCount ? "not-allowed" : "pointer", fontSize: 14, color: item.quantity >= item.stockCount ? "#CCC" : "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: "20px 24px", borderTop: "1px solid #EBEBEB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#666" }}>Subtotal</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.02em" }}>{formatNaira(total)}</span>
            </div>
            <button onClick={onCheckout}
              style={{ width: "100%", padding: "14px", background: "#1A1A1A", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Checkout
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "#BBB", marginTop: 10 }}>Secure checkout via Paystack</p>
          </div>
        )}
      </div>
    </div>
  );
}
