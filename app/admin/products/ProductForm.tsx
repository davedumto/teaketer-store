"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Variant {
  id?: string;
  label: string;
  priceOffset: number;
  stockCount: number;
  sku: string;
}

const CATEGORIES = [
  "Fashion", "Beauty", "Skincare", "Haircare", "Food & Drinks",
  "Electronics", "Home & Living", "Health & Wellness", "Accessories", "Other",
];

interface ProductFormProps {
  productId?: string;
  initial?: {
    name: string;
    category: string;
    description: string;
    images: string;
    basePriceKobo: number;
    stockCount: number;
    isActive: boolean;
    variants: Variant[];
  };
}

export default function ProductForm({ productId, initial }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [images, setImages] = useState(initial?.images ?? "");
  const [basePrice, setBasePrice] = useState(
    initial?.basePriceKobo ? String(initial.basePriceKobo / 100) : ""
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [stockCount, setStockCount] = useState(initial?.stockCount ?? 0);
  const [variants, setVariants] = useState<Variant[]>(initial?.variants ?? []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const sigRes = await fetch("/api/vendor/upload-signature");
      if (!sigRes.ok) { setError("Could not get upload signature."); return; }
      const sig = await sigRes.json();
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", sig.uploadPreset);
        fd.append("folder", sig.folder);
        fd.append("timestamp", String(sig.timestamp));
        fd.append("signature", sig.signature);
        fd.append("api_key", sig.apiKey);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.secure_url) uploaded.push(data.secure_url);
      }
      const existing = images.split(",").map((u) => u.trim()).filter(Boolean);
      setImages([...existing, ...uploaded].join(","));
    } catch {
      setError("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    setImages(images.split(",").map((u) => u.trim()).filter((u) => u && u !== url).join(","));
  }

  function addVariant() {
    setVariants((v) => [...v, { label: "", priceOffset: 0, stockCount: 0, sku: "" }]);
  }

  function updateVariant(idx: number, patch: Partial<Variant>) {
    setVariants((vs) => vs.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  function removeVariant(idx: number) {
    setVariants((vs) => vs.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const priceNum = parseFloat(basePrice.replace(/,/g, ""));
    if (isNaN(priceNum) || priceNum <= 0) { setError("Enter a valid base price."); return; }

    // Validate variants
    for (const v of variants) {
      if (!v.label.trim()) { setError("All variants need a name (e.g. 50ml, Red)."); return; }
      if (v.stockCount < 0) { setError("Stock can't be negative."); return; }
    }

    setLoading(true);
    try {
      const url = productId ? `/api/vendor/products/${productId}` : "/api/vendor/products";
      const res = await fetch(url, {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, category, description, images,
          basePriceKobo: Math.round(priceNum * 100),
          // Only send stockCount for no-variant products; variant products manage stock per-variant
          stockCount: variants.length === 0 ? stockCount : 0,
          isActive,
          variants,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed."); return; }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #EBEBEB",
    borderRadius: 24,
    padding: 24,
  };

  const inp: React.CSSProperties = {
    width: "100%",
    background: "#FAFAF8",
    border: "1.5px solid #E8E8E4",
    color: "#1A1A1A",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
  };

  const hint = { color: "#999", fontSize: 11, marginTop: 4 } as React.CSSProperties;

  const labelStyle: React.CSSProperties = {
    color: "#888",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Basic info ── */}
      <div style={card}>
        <div style={{ ...labelStyle, marginBottom: 16 }}>Product Info</div>
        <div className="space-y-4">

          <div>
            <label style={labelStyle}>
              Product Name *
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              style={inp} className="tk-input" placeholder="e.g. Rose Perfume Oil" />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inp, appearance: "none" }} className="tk-input">
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>
              Description
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              style={{ ...inp, resize: "none" }} className="tk-input"
              placeholder="Describe what makes this product special…" />
          </div>

          <div>
            <label style={labelStyle}>
              Base Price (₦) *
            </label>
            <input value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required
              style={{ ...inp, maxWidth: 200 }} className="tk-input" placeholder="5000" />
            <p style={hint}>This is the default price. If you add variants (e.g. sizes), you can add extra cost per variant.</p>
          </div>

          {variants.length === 0 && (
            <div>
              <label style={labelStyle}>Stock Quantity *</label>
              <input
                type="number"
                min={0}
                value={stockCount === 0 ? "" : stockCount}
                onChange={(e) => setStockCount(Math.max(0, parseInt(e.target.value || "0")))}
                style={{ ...inp, maxWidth: 200 }}
                className="tk-input"
                placeholder="0"
              />
              <p style={hint}>How many units you have available. Set to 0 to mark as sold out. Variants have their own stock counts.</p>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative flex-shrink-0">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="sr-only" />
              <div className="w-10 h-6 rounded-full transition-colors"
                style={{ background: isActive ? "#c4f23a" : "#E8E8E4" }}>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: isActive ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#1A1A1A" }}>
                {isActive ? "Visible to buyers" : "Hidden from store"}
              </div>
              <div style={hint}>Toggle off to hide this product without deleting it.</div>
            </div>
          </label>
        </div>
      </div>

      {/* ── Images ── */}
      <div style={card}>
        <div style={{ ...labelStyle, marginBottom: 4 }}>Product Images</div>
        <p style={{ ...hint, marginBottom: 12 }}>Upload one or more photos. First image is the main display photo.</p>

        {images && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.split(",").map((u) => u.trim()).filter(Boolean).map((url, i) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-20 h-20 rounded-2xl object-cover"
                  style={{ border: i === 0 ? "2px solid #c4f23a" : "1px solid #EBEBEB" }} />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-xs font-bold px-1.5 rounded-lg"
                    style={{ background: "#c4f23a", color: "#0a0a0a", fontSize: 9 }}>MAIN</span>
                )}
                <button type="button" onClick={() => removeImage(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "#ff4444", color: "#fff", border: "none" }}>×</button>
              </div>
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" id="img-upload" />
        <label htmlFor="img-upload"
          className="flex items-center justify-center gap-2 rounded-2xl py-3.5 cursor-pointer transition-colors"
          style={{ border: "1px dashed #E0E0E0", color: uploading ? "#c4f23a" : "#888", fontSize: 14, background: "#FAFAF8" }}>
          {uploading
            ? <><span className="tk-spinner" style={{ width: 16, height: 16 }} /> Uploading…</>
            : <>↑ Click to upload photos</>}
        </label>
      </div>

      {/* ── Variants ── */}
      <div style={card}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <div style={labelStyle}>Variants</div>
            <p style={{ ...hint, marginTop: 2 }}>
              Use variants for different sizes, scents, or colours. Each variant has its own stock count.
            </p>
          </div>
          <button type="button" onClick={addVariant}
            className="flex-shrink-0 ml-4 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
            style={{ color: "#1A1A1A", border: "1px solid #EBEBEB", background: "#F5F5F3" }}>
            + Add variant
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="mt-4 rounded-2xl py-6 text-center text-sm"
            style={{ background: "#FAFAF8", border: "1px dashed #E0E0E0", color: "#999" }}>
            No variants yet.<br />
            <span style={{ fontSize: 12 }}>Click &quot;+ Add variant&quot; to add sizes, scents, or colours.</span>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Column headers */}
            <div className="grid gap-2 px-1" style={{ gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 32px" }}>
              {["Variant name", "Extra price (₦)", "Stock qty", "SKU (optional)", ""].map((h) => (
                <div key={h} style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{h}</div>
              ))}
            </div>

            {variants.map((v, idx) => (
              <div key={idx}>
                <div className="grid gap-2" style={{ gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 32px" }}>
                  <input
                    value={v.label}
                    onChange={(e) => updateVariant(idx, { label: e.target.value })}
                    placeholder="e.g. 50ml, Rose, Red"
                    className="tk-input" style={inp} />
                  <input
                    type="number" min={0}
                    value={v.priceOffset === 0 ? "" : v.priceOffset / 100}
                    onChange={(e) => updateVariant(idx, { priceOffset: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    placeholder="0"
                    className="tk-input" style={inp} />
                  <input
                    type="number" min={0}
                    value={v.stockCount === 0 ? "" : v.stockCount}
                    onChange={(e) => updateVariant(idx, { stockCount: parseInt(e.target.value || "0") })}
                    placeholder="0"
                    className="tk-input" style={inp} />
                  <input
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                    placeholder="Optional"
                    className="tk-input" style={inp} />
                  <button type="button" onClick={() => removeVariant(idx)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ color: "#888", border: "1px solid #EBEBEB", background: "#FAFAF8" }}>
                    ×
                  </button>
                </div>
                {/* Per-row hints only on first row */}
                {idx === 0 && (
                  <div className="grid gap-2 px-1 mt-1" style={{ gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 32px" }}>
                    <div style={hint}>Name of this option</div>
                    <div style={hint}>Added on top of base price</div>
                    <div style={hint}>How many you have</div>
                    <div style={hint}>Your internal code</div>
                    <div />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{
          background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
        }}>{error}</div>
      )}

      <div className="flex gap-3 pb-4">
        <button type="button" onClick={() => router.back()}
          className="flex-1 font-semibold rounded-2xl py-3.5 transition-colors"
          style={{ background: "#F5F5F3", color: "#888", border: "1px solid #EBEBEB" }}>
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 font-bold rounded-2xl py-3.5 transition-transform hover:scale-[1.01] disabled:opacity-50"
          style={{ background: "#1A1A1A", color: "#fff", border: "none", fontSize: 15, borderRadius: 8 }}>
          {loading ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
