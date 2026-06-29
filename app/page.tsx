export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";
import HeroSlideshow from "@/components/HeroSlideshow";
import HomeNav from "@/components/HomeNav";

export default async function HomePage() {
  const [vendors, recentProducts] = await Promise.all([
    prisma.vendor.findMany({
      where: { isApproved: true, isActive: true },
      select: {
        id: true, storeName: true, storeSlug: true, storeDescription: true,
        logoUrl: true, bannerUrl: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.product.findMany({
      where: { isActive: true, vendor: { isApproved: true, isActive: true } },
      select: {
        id: true, name: true, images: true, basePriceKobo: true,
        variants: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 1 },
        vendor: { select: { storeName: true, storeSlug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 9,
    }),
  ]);

  const heroSlides = [
    { img: "/assets/Perfume Store Photo.jpg",        productName: "Signature scents",    storeName: "Fragrance", storeSlug: "" },
    { img: "/assets/African Online Store Photo.jpg", productName: "Curated collections", storeName: "Fashion",   storeSlug: "" },
    { img: "/assets/Lipgloss Store Photo.jpg",       productName: "Beauty essentials",   storeName: "Beauty",    storeSlug: "" },
    { img: "/assets/Shoe Store Photo.jpg",           productName: "Fresh kicks",         storeName: "Footwear",  storeSlug: "" },
  ];

  return (
    <div style={{ background: "#FAFAF7", color: "#1A1A1A", minHeight: "100vh", fontFamily: "inherit" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&display=swap');

        .tk-serif { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }

        .tk-nav-link { transition: color 0.15s; }
        .tk-nav-link:hover { color: #1A1A1A !important; }

        .tk-store-card:hover .tk-store-img { transform: scale(1.04); }
        .tk-store-img { transition: transform 0.5s ease; }

        .tk-prod-card:hover .tk-prod-img { transform: scale(1.04); }
        .tk-prod-img { transition: transform 0.55s ease; }
        .tk-prod-card:hover .tk-prod-overlay { opacity: 1 !important; }
        .tk-prod-overlay { transition: opacity 0.3s ease; }

        .tk-btn-dark:hover { background: #333 !important; }
        .tk-btn-lime:hover { background: #b8e034 !important; }

        @media (max-width: 900px) {
          .tk-hero-text { font-size: 3.5rem !important; }
          .tk-hero-split { flex-direction: column !important; }
          .tk-three-col { grid-template-columns: 1fr 1fr !important; }
          .tk-four-col  { grid-template-columns: 1fr 1fr !important; }
          .tk-cta-row   { flex-direction: column !important; gap: 24px !important; }
          .tk-hiw-grid  { grid-template-columns: 1fr 1fr !important; }
          .tk-hiw-header { flex-direction: column !important; gap: 16px !important; margin-bottom: 40px !important; }
          .tk-section-pad { padding: 64px 24px !important; }
          .tk-editorial { padding: 32px 24px !important; }
          .tk-editorial-inner { flex-direction: column !important; gap: 24px !important; }
          .tk-cta-box { padding: 48px 32px !important; }
          .tk-footer-inner { padding: 40px 24px 28px !important; }
        }
        @media (max-width: 580px) {
          .tk-hero-text { font-size: 2.4rem !important; }
          .tk-three-col { grid-template-columns: 1fr 1fr !important; }
          .tk-four-col  { grid-template-columns: 1fr 1fr !important; }
          .tk-hiw-grid  { grid-template-columns: 1fr 1fr !important; }
          .tk-section-pad { padding: 48px 16px !important; }
          .tk-editorial { padding: 24px 16px !important; }
          .tk-cta-box { padding: 40px 20px !important; }
          .tk-stats-row { flex-wrap: wrap !important; gap: 20px !important; justify-content: flex-start !important; }
          .tk-footer-inner { padding: 32px 16px 24px !important; }
          .tk-footer-cols { flex-direction: column !important; gap: 32px !important; }
        }
      `}</style>

      {/* ───────── NAVBAR ───────── */}
      <HomeNav />

      {/* ───────── HERO ───────── */}
      <HeroSlideshow slides={heroSlides} vendorCount={vendors.length} />

      {/* ───────── MARQUEE ───────── */}
      <div style={{ background: "#C4F23A", overflow: "hidden", padding: "14px 0", position: "relative" }}>
        <div style={{ display: "flex", gap: 48, animation: "marquee 18s linear infinite", whiteSpace: "nowrap", width: "max-content" }}>
          {[...Array(3)].map((_, i) =>
            ["Independent creators", "Paystack secured", "No buyer fees", "Ship from Nigeria", "Real products", "Real people"].map((t) => (
              <span key={`${i}-${t}`} style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#1A1A1A", display: "inline-flex", alignItems: "center", gap: 20 }}>
                {t} <span style={{ opacity: 0.3 }}>✦</span>
              </span>
            ))
          )}
        </div>
        <style>{`
          @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        `}</style>
      </div>

      {/* ───────── FEATURED STORES ───────── */}
      {vendors.length > 0 && (
        <section id="stores" className="tk-section-pad" style={{ maxWidth: 1360, margin: "0 auto", padding: "96px 40px" }}>
          {/* Section label */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 52, gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>Browse</div>
              <h2 className="tk-serif" style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", fontWeight: 700, color: "#1A1A1A", lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>
                The <em style={{ fontStyle: "italic" }}>stores</em>
              </h2>
            </div>
            <a href="#products" style={{ fontSize: 12, fontWeight: 700, color: "#999", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #DDD", paddingBottom: 3, whiteSpace: "nowrap" }}>
              View products ↓
            </a>
          </div>

          <div className="tk-three-col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {vendors.map((vendor, idx) => (
              <Link key={vendor.id} href={`/shop/${vendor.storeSlug}`} style={{ textDecoration: "none" }}>
                <div className="tk-store-card" style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "#F5F5F2", aspectRatio: idx === 0 ? "3/4" : "1/1.1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px 24px" }}>

                  {/* Blurred banner as background tint */}
                  {vendor.bannerUrl && (
                    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                      <img src={vendor.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(32px) saturate(0.4) brightness(1.1)", transform: "scale(1.1)", opacity: 0.35 }} />
                    </div>
                  )}

                  {/* Item count badge */}
                  <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,0.07)", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "0.04em" }}>
                    {vendor._count.products} items
                  </div>

                  {/* Logo */}
                  <div style={{ position: "relative", zIndex: 1, marginBottom: 20 }}>
                    {vendor.logoUrl
                      ? <img src={vendor.logoUrl} alt={vendor.storeName} className="tk-store-img" style={{ width: 96, height: 96, borderRadius: 22, objectFit: "cover", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "3px solid white" }} />
                      : <div style={{ width: 96, height: 96, borderRadius: 22, background: `hsl(${(idx * 47) % 360}, 20%, 82%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
                          {vendor.storeName.slice(0, 2).toUpperCase()}
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.01em", marginBottom: 4 }}>{vendor.storeName}</div>
                    {vendor.storeDescription && (
                      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 16 }}>
                        {vendor.storeDescription}
                      </div>
                    )}
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1A1A1A", color: "white", borderRadius: 100, padding: "7px 18px", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Shop now
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ───────── EDITORIAL BREAK ───────── */}
      <div className="tk-editorial" style={{ borderTop: "1px solid #E8E7E3", borderBottom: "1px solid #E8E7E3", background: "white", padding: "40px 40px" }}>
        <div className="tk-editorial-inner" style={{ maxWidth: 1360, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <p className="tk-serif" style={{ fontSize: "clamp(1.3rem, 2.5vw, 2rem)", fontWeight: 700, fontStyle: "italic", color: "#1A1A1A", margin: 0, lineHeight: 1.3, maxWidth: 560 }}>
            "Every store here is run by a real Nigerian vendor — not a faceless brand."
          </p>
          <div className="tk-stats-row" style={{ display: "flex", gap: 40 }}>
            {[
              { n: `${vendors.length}+`, label: "Active stores" },
              { n: "₦0", label: "Buyer fees" },
              { n: "100%", label: "Paystack secure" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div className="tk-serif" style={{ fontSize: "2rem", fontWeight: 900, color: "#1A1A1A", letterSpacing: "-0.03em", lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 6, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───────── NEW ARRIVALS ───────── */}
      {recentProducts.length > 0 && (
        <section id="products" className="tk-section-pad" style={{ maxWidth: 1360, margin: "0 auto", padding: "96px 40px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 52, gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#999", marginBottom: 14 }}>Just dropped</div>
              <h2 className="tk-serif" style={{ fontSize: "clamp(2.2rem, 4vw, 3.6rem)", fontWeight: 700, color: "#1A1A1A", lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>
                New <em style={{ fontStyle: "italic" }}>arrivals</em>
              </h2>
            </div>
          </div>

          <div className="tk-four-col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "56px 24px" }}>
            {recentProducts.map((product) => {
              const imgs = product.images ? product.images.split(",").filter(Boolean) : [];
              const variant = product.variants[0];
              const price = product.basePriceKobo + (variant?.priceOffset ?? 0);
              return (
                <Link key={product.id} href={`/shop/${product.vendor.storeSlug}`} style={{ textDecoration: "none" }} className="tk-prod-card">
                  {/* Image — tall portrait ratio like fashion editorial */}
                  <div style={{ position: "relative", aspectRatio: "3/4", background: "#EDECEA", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
                    {imgs[0]
                      ? <img src={imgs[0]} alt={product.name} className="tk-prod-img" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                    }
                    {/* Hover overlay */}
                    <div className="tk-prod-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", opacity: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ background: "white", color: "#1A1A1A", padding: "10px 22px", borderRadius: 100, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>View store</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#999", marginBottom: 6 }}>{product.vendor.storeName}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.4, marginBottom: 6 }}>{product.name}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.02em" }}>{formatNaira(price)}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="tk-section-pad" style={{ background: "#1A1A1A", padding: "96px 40px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div className="tk-hiw-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 48, flexWrap: "wrap", marginBottom: 72 }}>
            <h2 className="tk-serif" style={{ fontSize: "clamp(2.2rem, 4.5vw, 4.5rem)", fontWeight: 700, color: "white", lineHeight: 0.95, margin: 0, letterSpacing: "-0.03em" }}>
              Shopping<br /><em style={{ color: "#C4F23A", fontStyle: "italic" }}>made simple.</em>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, maxWidth: 340, margin: 0, paddingTop: 8 }}>
              No accounts. No friction. Browse, buy, and receive — the way it should be.
            </p>
          </div>

          <div className="tk-hiw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
            {[
              { n: "01", title: "Browse", body: "Explore stores from independent Nigerian sellers." },
              { n: "02", title: "Add to bag", body: "Pick your variant and quantity. No signup needed." },
              { n: "03", title: "Pay safely", body: "Paystack: card, bank transfer, or USSD." },
              { n: "04", title: "Track it", body: "Email confirmation instantly. Track anytime." },
            ].map((s, i) => (
              <div key={s.n} style={{
                padding: "40px 28px",
                borderTop: `1px solid ${i === 0 ? "#C4F23A" : "rgba(255,255,255,0.08)"}`,
                borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: i === 0 ? "#C4F23A" : "rgba(255,255,255,0.18)", marginBottom: 40 }}>{s.n}</div>
                <div className="tk-serif" style={{ fontSize: 22, fontWeight: 700, color: "white", marginBottom: 14, letterSpacing: "-0.02em" }}>{s.title}</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.75, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── VENDOR CTA ───────── */}
      <section className="tk-section-pad" style={{ padding: "96px 40px", background: "#FAFAF7" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div className="tk-cta-box" style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "#1A1A1A", padding: "80px 72px" }}>
            {/* Subtle lime glow */}
            <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,242,58,0.15) 0%, transparent 65%)", pointerEvents: "none" }} />
            <div className="tk-cta-row" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48 }}>
              <div style={{ maxWidth: 560 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>For sellers</div>
                <h2 className="tk-serif" style={{ fontSize: "clamp(2.4rem, 4vw, 4rem)", fontWeight: 700, color: "white", lineHeight: 1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
                  Your products<br /><em style={{ fontStyle: "italic", color: "#C4F23A" }}>deserve an audience.</em>
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, margin: 0 }}>
                  Built-in affiliate marketing, Paystack payments, real-time stock alerts, and your own storefront. Everything you need — nothing you don't.
                </p>
              </div>
              <Link href="/admin/register" className="tk-btn-lime" style={{
                flexShrink: 0, display: "inline-block", padding: "18px 44px",
                background: "#C4F23A", color: "#1A1A1A", borderRadius: 100,
                fontWeight: 800, fontSize: 13, letterSpacing: "0.08em",
                textTransform: "uppercase", textDecoration: "none",
              }}>
                Open your store →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer style={{ background: "#111110", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="tk-footer-inner" style={{ maxWidth: 1360, margin: "0 auto", padding: "56px 40px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 40, flexWrap: "wrap", paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <Image src="/logo.png" alt="Teaketer" width={130} height={32} style={{ objectFit: "contain", display: "block", marginBottom: 14 }} />
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", maxWidth: 260, lineHeight: 1.7, margin: 0 }}>
                Multi-vendor commerce for independent Nigerian creators.
              </p>
            </div>
            <div className="tk-footer-cols" style={{ display: "flex", gap: 48 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>Shop</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <a href="#stores" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Browse stores</a>
                  <a href="#products" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>New arrivals</a>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>Sell</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Link href="/admin/register" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Open a store</Link>
                  <Link href="/admin/login" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Vendor login</Link>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 16 }}>Affiliates</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Link href="/affiliate/login" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Affiliate login</Link>
                </div>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>© 2026 Teaketer. All rights reserved.</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>Made in Nigeria ✦</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
