"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  category: string;
  basePriceKobo: number;
  images: string;
  vendor: { storeName: string; storeSlug: string };
}

interface Store {
  id: string;
  storeName: string;
  storeSlug: string;
  storeDescription: string;
  logoUrl: string;
  bannerUrl: string;
  _count: { products: number };
}

function fmtPrice(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

type Tab = "all" | "products" | "stores";

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<Tab>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setProducts([]); setStores([]); setSearched(false); return;
    }
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) { setProducts([]); setStores([]); setSearched(true); return; }
      const data = await res.json();
      setProducts(data.products ?? []);
      setStores(data.stores ?? []);
      setSearched(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setProducts([]); setStores([]); setSearched(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (q) search(q); }, [q, search]);

  // Keep input in sync with URL (browser back/forward)
  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, []);

  function handleInput(val: string) {
    setInput(val);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(val)}`, { scroll: false });
    }, 350);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounce.current) clearTimeout(debounce.current);
    router.replace(`/search?q=${encodeURIComponent(input)}`, { scroll: false });
    // useEffect fires search() when q updates from the URL change above
  }

  const showProducts = tab === "all" || tab === "products";
  const showStores = tab === "all" || tab === "stores";
  const total = products.length + stores.length;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "var(--font-jakarta, sans-serif)" }}>

      {/* Top bar */}
      <div style={{ background: "white", borderBottom: "1px solid #EBEBEB", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#1A1A1A", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <Image src="/logo.png" alt="Teaketer" width={90} height={22} style={{ objectFit: "contain", display: "block" }} />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSubmit} style={{ flex: 1, maxWidth: 560 }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#BBB" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                autoFocus
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="Search products, stores…"
                style={{ width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: 100, border: "1.5px solid #E0E0E0", fontSize: 14, fontWeight: 500, outline: "none", background: "#F7F7F5", color: "#1A1A1A", boxSizing: "border-box" }}
              />
              {loading && (
                <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, border: "2px solid #E0E0E0", borderTopColor: "#1A1A1A", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              )}
            </div>
          </form>
        </div>

        {/* Tabs */}
        {searched && (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, borderTop: "1px solid #F0F0F0" }}>
            {([
              { key: "all", label: `All (${total})` },
              { key: "products", label: `Products (${products.length})` },
              { key: "stores", label: `Stores (${stores.length})` },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: "10px 20px", fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? "#1A1A1A" : "#888", background: "none", border: "none", cursor: "pointer", borderBottom: tab === t.key ? "2px solid #1A1A1A" : "2px solid transparent", transition: "all 0.15s" }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>

        {/* Empty / idle state */}
        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#BBB" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 16, opacity: 0.4 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#999", margin: 0 }}>Search for products or stores</p>
          </div>
        )}

        {/* No results */}
        {searched && total === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", marginBottom: 8 }}>No results for &ldquo;{q}&rdquo;</p>
            <p style={{ fontSize: 14, color: "#999" }}>Try a different keyword or browse the stores.</p>
            <Link href="/#stores" style={{ display: "inline-block", marginTop: 20, padding: "10px 24px", background: "#1A1A1A", color: "white", borderRadius: 100, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Browse stores</Link>
          </div>
        )}

        {/* Stores section */}
        {searched && showStores && stores.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: 16 }}>Stores</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {stores.map((store, idx) => (
                <Link key={store.id} href={`/shop/${store.storeSlug}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRadius: 16, overflow: "hidden", background: "#F5F5F2", aspectRatio: "1/1.05", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px 20px", transition: "transform 0.2s", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "none")}>
                    {store.bannerUrl && (
                      <div style={{ position: "absolute", inset: 0 }}>
                        <img src={store.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(24px) saturate(0.4) brightness(1.1)", transform: "scale(1.1)", opacity: 0.3 }} />
                      </div>
                    )}
                    <div style={{ position: "relative", zIndex: 1, marginBottom: 12 }}>
                      {store.logoUrl
                        ? <img src={store.logoUrl} alt={store.storeName} style={{ width: 72, height: 72, borderRadius: 16, objectFit: "cover", border: "2px solid white", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }} />
                        : <div style={{ width: 72, height: 72, borderRadius: 16, background: `hsl(${(idx * 47) % 360}, 20%, 80%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "white" }}>{store.storeName.slice(0, 2).toUpperCase()}</div>
                      }
                    </div>
                    <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A", marginBottom: 2 }}>{store.storeName}</div>
                      <div style={{ fontSize: 11, color: "#999", marginBottom: 10 }}>{store._count.products} products</div>
                      <div style={{ display: "inline-block", background: "#1A1A1A", color: "white", borderRadius: 100, padding: "5px 14px", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>Visit store</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Products section */}
        {searched && showProducts && products.length > 0 && (
          <section>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: 16 }}>Products</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {products.map((product) => {
                const img = product.images.split(",")[0]?.trim();
                return (
                  <Link key={product.id} href={`/shop/${product.vendor.storeSlug}#product-${product.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ borderRadius: 16, overflow: "hidden", background: "white", border: "1px solid #F0F0F0", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                      {/* Image */}
                      <div style={{ aspectRatio: "1/1", background: "#F5F5F2", overflow: "hidden" }}>
                        {img
                          ? <img src={img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DDD" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6M15 9l-6 6"/></svg>
                            </div>
                        }
                      </div>
                      {/* Info */}
                      <div style={{ padding: "12px 14px" }}>
                        {product.category && (
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB", marginBottom: 4 }}>{product.category}</div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{product.vendor.storeName}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A" }}>{fmtPrice(product.basePriceKobo)}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }
        input:focus { border-color: #1A1A1A !important; background: white !important; }
      `}</style>
    </div>
  );
}
