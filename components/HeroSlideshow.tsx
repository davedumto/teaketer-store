"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Slide {
  img: string;
  productName: string;
  storeName: string;
  storeSlug: string;
}

export default function HeroSlideshow({
  slides,
  vendorCount,
}: {
  slides: Slide[];
  vendorCount: number;
}) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setActive((cur) => {
        setPrev(cur);
        return (cur + 1) % slides.length;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [slides.length]);

  // Crossfade: show both prev and active layered
  return (
    <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>

      {/* Slides */}
      {slides.length > 0 ? (
        <>
          {/* Previous slide — fading out */}
          {prev !== null && (
            <div key={`prev-${prev}`} style={{ position: "absolute", inset: 0, animation: "tk-fade-out 1.1s ease forwards", zIndex: 1 }}>
              <img src={slides[prev].img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(4,3,2,0.97) 0%, rgba(4,3,2,0.75) 35%, rgba(4,3,2,0.3) 60%, rgba(4,3,2,0.05) 100%)" }} />
            </div>
          )}
          {/* Active slide — fading in */}
          <div key={`active-${active}`} style={{ position: "absolute", inset: 0, animation: "tk-fade-in 1.1s ease forwards", zIndex: 2 }}>
            <img src={slides[active].img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(4,3,2,0.97) 0%, rgba(4,3,2,0.75) 35%, rgba(4,3,2,0.3) 60%, rgba(4,3,2,0.05) 100%)" }} />
          </div>
        </>
      ) : (
        /* No product images — warm gradient fallback */
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1A1209 0%, #2C1F0E 40%, #1A1A1A 100%)", zIndex: 1 }}>
          <div style={{ position: "absolute", top: "30%", left: "65%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(196,242,58,0.12) 0%, transparent 70%)", transform: "translate(-50%,-50%)" }} />
        </div>
      )}

      {/* Dot nav */}
      {slides.length > 1 && (
        <div style={{ position: "absolute", bottom: 28, right: "clamp(16px, 4vw, 40px)", display: "flex", gap: 6, zIndex: 10 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => { setPrev(active); setActive(i); }}
              style={{ width: i === active ? 20 : 6, height: 6, borderRadius: 100, border: "none", cursor: "pointer", padding: 0, background: i === active ? "#C4F23A" : "rgba(255,255,255,0.3)", transition: "width 0.3s ease, background 0.3s ease" }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}


      {/* Hero text — always on top */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1360, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px) clamp(56px, 8vw, 96px)", width: "100%", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4F23A", display: "inline-block" }} />
            {vendorCount > 0 ? `${vendorCount} store${vendorCount !== 1 ? "s" : ""} · Nigeria` : "Nigeria's marketplace"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "clamp(2.8rem, 7vw, 7.5rem)", fontWeight: 900, color: "white",
            lineHeight: 0.92, letterSpacing: "-0.03em", margin: 0, maxWidth: 760,
          }}>
            Shop from<br />
            <em style={{ fontStyle: "italic", color: "#C4F23A" }}>independent</em><br />
            <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>Nigerian vendors.</span>
          </h1>

          <div style={{ maxWidth: 320, flexShrink: 0, paddingBottom: 8, minWidth: 240 }}>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.8, margin: "0 0 24px" }}>
              Shop directly from independent Nigerian vendors. Every purchase tells a story.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="#stores" style={{ display: "inline-block", padding: "13px 28px", background: "#C4F23A", color: "#1A1A1A", borderRadius: 100, fontWeight: 800, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Explore stores
              </a>
              <Link href="/admin/register" style={{ display: "inline-block", padding: "13px 22px", background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 100, fontWeight: 600, fontSize: 12, textDecoration: "none" }}>
                Start selling
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tk-fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tk-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @media (max-width: 640px) {
          .tk-hero-split-inner { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
        }
      `}</style>
    </section>
  );
}
