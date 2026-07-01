"use client";

import { useState, useEffect } from "react";
import { formatNaira } from "@/lib/utils";
import type { CartItem } from "./StorefrontClient";

async function lookupAffiliateCode(storeSlug: string, code: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/store/affiliate-lookup?slug=${encodeURIComponent(storeSlug)}&code=${encodeURIComponent(code)}`);
    return res.ok && (await res.json()).valid === true;
  } catch {
    return false;
  }
}

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const inp: React.CSSProperties = {
  width: "100%",
  background: "#FAFAF8",
  border: "1.5px solid #E8E8E4",
  color: "#1A1A1A",
  borderRadius: 8,
  padding: "11px 14px",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

export default function CheckoutModal({
  isOpen, onClose, cart, storeSlug, affiliateCode, onAffiliateApply, onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  storeSlug: string;
  affiliateCode: string | null;
  onAffiliateApply: (code: string) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", state: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeState, setCodeState] = useState<"idle" | "checking" | "ok" | "invalid">("idle");
  const [deliveryZones, setDeliveryZones] = useState<{ state: string; feeKobo: number }[]>([]);
  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesError, setZonesError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setZonesLoaded(false);
    setZonesError(false);
    fetch(`/api/store/delivery-zones?slug=${encodeURIComponent(storeSlug)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setDeliveryZones(d.zones ?? []); setZonesLoaded(true); })
      .catch(() => { setZonesError(true); setZonesLoaded(true); });
  }, [isOpen, storeSlug]);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const hasAnyZones = deliveryZones.length > 0;
  const deliveryFee = zonesError
    ? -2  // -2 = could not load zones; block checkout
    : !form.state
    ? null
    : !hasAnyZones
    ? 0  // vendor hasn't configured zones — treat as free (no delivery restriction)
    : (deliveryZones.find((z) => z.state === form.state)?.feeKobo ?? -1); // -1 = state not served

  async function applyCode() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeState("checking");
    const valid = await lookupAffiliateCode(storeSlug, code);
    if (valid) {
      setCodeState("ok");
      onAffiliateApply(code);
    } else {
      setCodeState("invalid");
    }
  }

  const subtotal = cart.reduce((s, i) => s + i.priceKobo * i.quantity, 0);
  const stateNotServed = deliveryFee === -1;
  const zonesLoadError = deliveryFee === -2;
  const total = subtotal + (deliveryFee !== null && deliveryFee >= 0 ? deliveryFee : 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stateNotServed || zonesLoadError) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug,
          buyerName: form.name,
          buyerEmail: form.email,
          buyerPhone: form.phone,
          deliveryAddress: form.address,
          deliveryState: form.state,
          deliveryNote: form.note,
          items: cart.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          affiliateCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Checkout failed."); return; }
      onSuccess();
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", padding: "0 12px" }}
      className="sm:items-center">
      <div style={{ width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", background: "white", borderRadius: "16px 16px 0 0", boxShadow: "0 -8px 48px rgba(0,0,0,0.12)" }}
        className="no-sb sm:rounded-2xl">

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", borderRadius: "16px 16px 0 0" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>Checkout</div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #EBEBEB", background: "white", cursor: "pointer", fontSize: 18, color: "#888", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ×
          </button>
        </div>

        {/* Order summary */}
        <div style={{ padding: "14px 24px", background: "#FAFAF8", borderBottom: "1px solid #EBEBEB" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {cart.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""} × {item.quantity}</span>
                <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{formatNaira(item.priceKobo * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: 10, borderTop: "1px solid #EBEBEB", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#666" }}>Subtotal</span>
              <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{formatNaira(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#666" }}>Delivery</span>
              <span style={{ fontWeight: 600, color: zonesLoadError ? "#DC2626" : stateNotServed ? "#DC2626" : deliveryFee === null ? "#BBB" : deliveryFee === 0 ? "#2D6A00" : "#1A1A1A" }}>
                {zonesLoadError
                  ? "Unavailable"
                  : stateNotServed
                  ? "Not available to this state"
                  : deliveryFee === null
                  ? "Select a state"
                  : deliveryFee === 0 ? "Free" : formatNaira(deliveryFee)}
              </span>
            </div>
            {zonesLoadError && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#DC2626" }}>
                Could not load delivery fees. Please refresh and try again.
              </p>
            )}
            {stateNotServed && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#DC2626" }}>
                This store doesn&apos;t deliver to {form.state}. Please select a different state or contact the vendor.
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px solid #EBEBEB" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.02em" }}>{formatNaira(total)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Labels */}
          {[
            { label: "Full Name", field: "name", type: "text", placeholder: "Jane Doe", half: false },
            { label: "Email Address", field: "email", type: "email", placeholder: "jane@example.com", half: false },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>{label}</label>
              <input type={type} value={(form as Record<string, string>)[field]} onChange={set(field)} required style={inp} placeholder={placeholder} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Phone</label>
              <input value={form.phone} onChange={set("phone")} required style={inp} placeholder="08012345678" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>State</label>
              <select value={form.state} onChange={set("state")} required style={{ ...inp, appearance: "none" }}>
                <option value="">Select…</option>
                {NIGERIAN_STATES.map((s, i) => <option key={`${s}-${i}`} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Delivery Address</label>
            <input value={form.address} onChange={set("address")} required style={inp} placeholder="House no., street, city" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Delivery Note <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10 }}>(optional)</span></label>
            <textarea value={form.note} onChange={set("note")} rows={2} style={{ ...inp, resize: "none" }} placeholder="Landmark, gate colour, any instructions…" />
          </div>

          {/* Affiliate code entry */}
          {affiliateCode ? (
            <div style={{ background: "#F6FDE8", border: "1px solid #D4EFA0", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, color: "#4A7C10", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              Referral code applied: <strong>{affiliateCode}</strong>
            </div>
          ) : (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>
                Affiliate code <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 10 }}>(optional)</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeState("idle"); }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCode())}
                  placeholder="e.g. DAVID15"
                  style={{ ...inp, flex: 1, textTransform: "uppercase", letterSpacing: "0.08em", border: codeState === "invalid" ? "1.5px solid #FECACA" : codeState === "ok" ? "1.5px solid #D4EFA0" : inp.border }}
                />
                <button
                  type="button"
                  onClick={applyCode}
                  disabled={codeState === "checking" || !codeInput.trim()}
                  style={{ padding: "0 16px", background: "#1A1A1A", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: !codeInput.trim() ? 0.4 : 1 }}
                >
                  {codeState === "checking" ? "…" : "Apply"}
                </button>
              </div>
              {codeState === "invalid" && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#DC2626" }}>Code not found for this store.</p>
              )}
              {codeState === "ok" && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4A7C10", fontWeight: 600 }}>✓ Code applied!</p>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#DC2626" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || stateNotServed || zonesLoadError}
            style={{ width: "100%", padding: "14px", background: loading || stateNotServed || zonesLoadError ? "#888" : "#1A1A1A", color: "white", border: "none", borderRadius: 8, cursor: loading || stateNotServed || zonesLoadError ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
            {loading ? "Processing…" : stateNotServed ? "Delivery not available" : zonesLoadError ? "Reload to continue" : `Pay ${formatNaira(total)} via Paystack`}
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "#BBB", margin: 0 }}>Payments are secured by Paystack</p>
        </form>
      </div>
    </div>
  );
}
