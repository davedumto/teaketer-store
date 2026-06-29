"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { formatNaira } from "@/lib/utils";
import { getPusherClient, storeChannel, EVENTS } from "@/lib/pusher";
import type { StockUpdate } from "@/lib/commerce";
import CartDrawer from "./CartDrawer";
import CheckoutModal from "./CheckoutModal";

interface Variant {
  id: string;
  label: string;
  priceOffset: number;
  stockCount: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  images: string;
  basePriceKobo: number;
  stockCount: number;
  variants: Variant[];
}

interface Vendor {
  storeName: string;
  storeDescription: string;
  logoUrl: string;
  bannerUrl: string;
  storeSlug: string;
  allowPublicAffiliate: boolean;
  socialInstagram: string;
  socialFacebook: string;
  socialWhatsapp: string;
}

export interface CartItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel: string;
  priceKobo: number;
  quantity: number;
  stockCount: number;
}

function ProductCard({
  product,
  activeVariantId,
  onVariantChange,
  onAddToCart,
  liveStock,
}: {
  product: Product;
  activeVariantId: string | null;
  onVariantChange: (variantId: string) => void;
  onAddToCart: (product: Product, variantId: string | null, qty: number) => void;
  liveStock: Record<string, number>;
}) {
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = product.images ? product.images.split(",").filter(Boolean) : [];
  const activeVariant = product.variants.find((v) => v.id === activeVariantId);
  const price = product.basePriceKobo + (activeVariant?.priceOffset ?? 0);
  const stock = product.variants.length === 0
    // No-variant product: use live update keyed by productId, fall back to DB stockCount
    ? (product.id in liveStock ? liveStock[product.id] : product.stockCount)
    // Variant product: use live update keyed by variantId, fall back to variant's stockCount
    : (activeVariantId && activeVariantId in liveStock
        ? liveStock[activeVariantId]
        : (activeVariant?.stockCount ?? 0));

  const outOfStock = stock === 0;

  return (
    <div id={`product-${product.id}`} style={{ display: "flex", flexDirection: "column" }}>
      {/* Image */}
      <div
        className="group"
        style={{ position: "relative", aspectRatio: "1", background: "#F5F5F3", overflow: "hidden", marginBottom: 14 }}
        onMouseEnter={() => imgs.length > 1 && setImgIdx(1)}
        onMouseLeave={() => setImgIdx(0)}
      >
        {imgs.length > 0 ? (
          imgs.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={product.name}
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover",
                opacity: imgIdx === i ? 1 : 0,
                transition: "opacity 0.4s ease",
              }}
            />
          ))
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
        {outOfStock && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>Sold Out</span>
          </div>
        )}
        {/* Thumbnail dots */}
        {imgs.length > 1 && (
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 4 }}>
            {imgs.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)}
                style={{ width: 5, height: 5, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
                  background: imgIdx === i ? "#1A1A1A" : "rgba(0,0,0,0.25)", transition: "background 0.2s" }} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: outOfStock ? "#DC2626" : "#999" }}>
          {product.variants.length > 0 ? "Available in variants" : outOfStock ? "Sold out" : "In stock"}
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", lineHeight: 1.35 }}>{product.name}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{formatNaira(price)}</div>

        {/* Variant pills */}
        {product.variants.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
            {product.variants.map((v) => (
              <button key={v.id} onClick={() => onVariantChange(v.id)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                  border: activeVariantId === v.id ? "1.5px solid #1A1A1A" : "1.5px solid #E0E0E0",
                  background: activeVariantId === v.id ? "#1A1A1A" : "white",
                  color: activeVariantId === v.id ? "white" : "#555",
                  transition: "all 0.15s",
                }}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Qty + Add */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #E0E0E0", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={outOfStock}
              style={{ width: 36, height: 44, border: "none", background: "white", cursor: "pointer", fontSize: 16, color: "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              −
            </button>
            <span style={{ width: 28, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{qty}</span>
            <button onClick={() => setQty((q) => Math.min(stock, q + 1))} disabled={outOfStock || qty >= stock}
              style={{ width: 36, height: 44, border: "none", background: "white", cursor: (outOfStock || qty >= stock) ? "not-allowed" : "pointer", fontSize: 16, color: (outOfStock || qty >= stock) ? "#CCC" : "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              +
            </button>
          </div>
          <button
            onClick={() => { onAddToCart(product, activeVariantId, qty); setQty(1); }}
            disabled={outOfStock}
            style={{
              flex: 1, height: 44, border: "none", borderRadius: 6, cursor: outOfStock ? "not-allowed" : "pointer",
              background: outOfStock ? "#E8E8E8" : "#1A1A1A",
              color: outOfStock ? "#999" : "white",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "background 0.15s",
            }}>
            {outOfStock ? "Sold Out" : "Add to Bag"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StorefrontClient({
  vendor,
  products,
  affiliateCode,
}: {
  vendor: Vendor;
  products: Product[];
  affiliateCode: string | null;
}) {
  const CART_KEY = `cart_${vendor.storeSlug}`;
  const AFF_KEY = `aff_${vendor.storeSlug}`;

  // Initialise cart synchronously from localStorage so the badge count is
  // correct on the very first render (no flash of zero).
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`cart_${vendor.storeSlug}`);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [activeVariants, setActiveVariants] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of products) {
      if (p.variants[0]) init[p.id] = p.variants[0].id;
    }
    return init;
  });
  const [liveStock, setLiveStock] = useState<Record<string, number>>({});

  useEffect(() => {
    if (affiliateCode) sessionStorage.setItem(AFF_KEY, affiliateCode.toUpperCase());
  }, [affiliateCode, AFF_KEY]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(storeChannel(vendor.storeSlug));
    channel.bind(EVENTS.STOCK_UPDATED, (data: StockUpdate) => {
      setLiveStock((prev) => ({ ...prev, [data.variantId]: data.newStock }));
    });
    return () => { channel.unbind_all(); pusher.unsubscribe(storeChannel(vendor.storeSlug)); };
  }, [vendor.storeSlug]);

  const saveCart = useCallback((items: CartItem[]) => {
    setCart(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [CART_KEY]);

  function getAffiliateCode(): string | null {
    try { return sessionStorage.getItem(AFF_KEY); } catch { return null; }
  }

  function addToCart(product: Product, variantId: string | null, qty: number) {
    const variant = product.variants.find((v) => v.id === variantId);
    const priceKobo = product.basePriceKobo + (variant?.priceOffset ?? 0);
    const variantLabel = variant?.label ?? "";
    const stockAvailable = product.variants.length === 0
      ? (product.id in liveStock ? liveStock[product.id] : product.stockCount)
      : (variantId && variantId in liveStock ? liveStock[variantId] : (variant?.stockCount ?? 0));

    const existing = cart.findIndex((i) => i.productId === product.id && i.variantId === variantId);
    const currentQty = existing >= 0 ? cart[existing].quantity : 0;
    // Cap so total in cart never exceeds available stock
    const cappedQty = Math.min(qty, Math.max(0, stockAvailable - currentQty));
    if (cappedQty <= 0) return;

    const updated = existing >= 0
      ? cart.map((item, i) => i === existing ? { ...item, quantity: item.quantity + cappedQty } : item)
      : [...cart, { productId: product.id, variantId, productName: product.name, variantLabel, priceKobo, quantity: cappedQty, stockCount: stockAvailable }];
    saveCart(updated);
    setCartOpen(true);
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ background: "#FAFAF8", color: "#1A1A1A", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Topbar ── */}
      <div style={{ background: "#1A1A1A", color: "white", textAlign: "center", padding: "8px 20px", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em" }}>
        Free delivery on orders over ₦50,000
      </div>

      {/* ── Navbar ── */}
      <header style={{ background: "white", borderBottom: "1px solid #EBEBEB", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

          {/* Store identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            {vendor.logoUrl
              ? <img src={vendor.logoUrl} alt={vendor.storeName} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1px solid #EBEBEB", flexShrink: 0 }} />
              : <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1A1A1A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                  {vendor.storeName[0].toUpperCase()}
                </div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vendor.storeName}</div>
              {vendor.storeDescription && <div style={{ fontSize: 11, color: "#999", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vendor.storeDescription}</div>}
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <style>{`
              @keyframes shimmer-sweep {
                0%   { transform: translateX(-120%) skewX(-20deg); }
                100% { transform: translateX(220%) skewX(-20deg); }
              }
              .track-btn {
                position: relative;
                overflow: hidden;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                font-weight: 600;
                color: #2D6A00;
                text-decoration: none;
                letter-spacing: 0.01em;
                padding: 7px 10px;
                border-radius: 8px;
                border: 1.5px solid #C4F23A;
                background: transparent;
                transition: background 0.2s, color 0.2s;
                white-space: nowrap;
              }
              .track-btn:hover {
                background: #F0FDD4;
              }
              .track-btn::after {
                content: '';
                position: absolute;
                top: 0; left: 0;
                width: 40%;
                height: 100%;
                background: linear-gradient(
                  90deg,
                  transparent 0%,
                  rgba(255,255,255,0.55) 50%,
                  transparent 100%
                );
                animation: shimmer-sweep 2.6s ease-in-out infinite;
              }
              .track-btn .track-label {
                display: none;
              }
              @media (min-width: 480px) {
                .track-btn .track-label {
                  display: inline;
                }
              }
            `}</style>
            <a href={`/shop/${vendor.storeSlug}/track`} className="track-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <span className="track-label">Track order</span>
            </a>
            <button onClick={() => setCartOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "#1A1A1A", color: "white", border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, letterSpacing: "0.03em", position: "relative" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Bag
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#C4F23A", color: "#1A1A1A", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero banner (only if bannerUrl set) ── */}
      {vendor.bannerUrl && (
        <div style={{ position: "relative", height: "clamp(220px, 38vw, 340px)", overflow: "hidden" }}>
          <img src={vendor.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {/* Gradient: strong left fade for text legibility, fades out at 60% */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 50%, transparent 80%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 clamp(16px, 4vw, 48px)" }}>
            <div style={{ maxWidth: 520 }}>
              {/* Store name as eyebrow */}
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 10 }}>
                {vendor.storeName}
              </div>
              {/* Headline: always short — "Shop our collection" or first sentence only */}
              <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "white", lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                Shop our collection
              </h1>
              {/* Description: capped at 2 lines, smaller, muted */}
              {vendor.storeDescription && (
                <p style={{
                  fontSize: "clamp(12px, 1.5vw, 14px)",
                  color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.55,
                  margin: "0 0 18px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  maxWidth: 420,
                }}>
                  {vendor.storeDescription}
                </p>
              )}
              <a href="#products"
                style={{ display: "inline-block", padding: "10px 22px", background: "white", color: "#1A1A1A", borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Shop Now
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main id="products" style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "32px 16px" }}>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#F0F0EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="1.5"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 6 }}>No products yet</div>
            <p style={{ fontSize: 14, color: "#888" }}>Check back soon — something great is coming.</p>
          </div>
        ) : (
          <>
            {/* Section heading — Elevare style */}
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.025em", lineHeight: 1.1, margin: "0 0 8px" }}>
                Our <em style={{ fontStyle: "italic", fontWeight: 800 }}>Collection</em>
              </h2>
              <p style={{ fontSize: 14, color: "#888", margin: 0 }}>{products.length} product{products.length !== 1 ? "s" : ""} available</p>
            </div>

            {/* Product grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "32px 16px" }}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  activeVariantId={activeVariants[product.id] ?? null}
                  onVariantChange={(vid) => setActiveVariants((prev) => ({ ...prev, [product.id]: vid }))}
                  onAddToCart={addToCart}
                  liveStock={liveStock}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #EBEBEB", background: "white" }}>
        {vendor.allowPublicAffiliate && (
          <div style={{ background: "#1A1A1A", padding: "20px 16px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 2 }}>Earn by sharing</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0 }}>Join our affiliate program and earn on every sale you refer.</p>
              </div>
              <a href={`/shop/${vendor.storeSlug}/affiliate`}
                style={{ padding: "9px 18px", background: "#C4F23A", color: "#1A1A1A", borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                Join now →
              </a>
            </div>
          </div>
        )}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href={`/shop/${vendor.storeSlug}/track`}
              style={{ fontSize: 13, color: "#888", textDecoration: "none", fontWeight: 500 }}>
              Click to Track order
            </a>
            {/* Social links */}
            {(vendor.socialInstagram || vendor.socialFacebook || vendor.socialWhatsapp) && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#CCC" }}>·</span>
                {vendor.socialInstagram && (
                  <a href={vendor.socialInstagram} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#F5F5F3", textDecoration: "none" }}
                    title="Instagram">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="#888"/></svg>
                  </a>
                )}
                {vendor.socialFacebook && (
                  <a href={vendor.socialFacebook} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#F5F5F3", textDecoration: "none" }}
                    title="Facebook">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#888"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                  </a>
                )}
                {vendor.socialWhatsapp && (
                  <a href={vendor.socialWhatsapp} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#F5F5F3", textDecoration: "none" }}
                    title="WhatsApp">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#888"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#BBB" }}>
            <span>Powered by</span>
            <Image src="/logo.png" alt="Teaketer" width={14} height={14} style={{ borderRadius: 3, opacity: 0.5 }} />
            <span style={{ fontWeight: 700, color: "#888" }}>Teaketer</span>
          </div>
        </div>
      </footer>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateCart={saveCart}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        storeSlug={vendor.storeSlug}
        affiliateCode={getAffiliateCode()}
        onAffiliateApply={(code) => sessionStorage.setItem(AFF_KEY, code)}
        onSuccess={() => saveCart([])}
      />
    </div>
  );
}
