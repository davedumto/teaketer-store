"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const LINKS = [
  { label: "Stores", href: "#stores" },
  { label: "Products", href: "#products" },
];

export default function HomeNav() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (searchVal.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(searchVal.trim())}`);
    setSearchOpen(false);
    setSearchVal("");
  }

  return (
    <>
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(250,250,247,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 clamp(16px,4vw,40px)", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
            <Image src="/logo.png" alt="Teaketer" width={120} height={30} style={{ objectFit: "contain", display: "block" }} />
          </Link>

          {/* Desktop links */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="tk-nav-links">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className="tk-nav-link" style={{ fontSize: 13, color: "#999", textDecoration: "none", fontWeight: 500 }}>{l.label}</a>
            ))}
            <button onClick={openSearch} aria-label="Search" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#999", display: "flex", alignItems: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <div style={{ width: 1, height: 16, background: "#E0E0DB" }} />
            <Link href="/affiliate/login" className="tk-nav-link" style={{ fontSize: 13, color: "#999", textDecoration: "none", fontWeight: 500 }}>Affiliate login</Link>
            <Link href="/admin/login" className="tk-nav-link" style={{ fontSize: 13, color: "#999", textDecoration: "none", fontWeight: 500 }}>Vendor login</Link>
            <Link href="/admin/register" className="tk-btn-dark" style={{ fontSize: 12, fontWeight: 700, color: "white", textDecoration: "none", padding: "9px 22px", background: "#1A1A1A", borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Sell with us
            </Link>
          </div>

          {/* Mobile right side: Search + Sell button + hamburger */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="tk-nav-mobile-right">
            <button onClick={openSearch} aria-label="Search" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#1A1A1A", display: "flex", alignItems: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <Link href="/admin/register" style={{ fontSize: 11, fontWeight: 700, color: "white", textDecoration: "none", padding: "8px 16px", background: "#1A1A1A", borderRadius: 100, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Sell
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              style={{ width: 44, height: 44, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: 0, flexShrink: 0 }}
            >
              <span style={{ display: "block", width: 22, height: 2, background: "#1A1A1A", borderRadius: 2, transition: "transform 0.25s, opacity 0.25s", transform: open ? "translateY(7px) rotate(45deg)" : "none" }} />
              <span style={{ display: "block", width: 22, height: 2, background: "#1A1A1A", borderRadius: 2, transition: "opacity 0.2s", opacity: open ? 0 : 1 }} />
              <span style={{ display: "block", width: 22, height: 2, background: "#1A1A1A", borderRadius: 2, transition: "transform 0.25s, opacity 0.25s", transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 99, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: 66, left: 0, right: 0, background: "rgba(250,250,247,0.98)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "8px 0 20px" }}
          >
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ display: "block", padding: "14px clamp(16px,4vw,40px)", fontSize: 15, fontWeight: 600, color: "#1A1A1A", textDecoration: "none" }}
              >
                {l.label}
              </a>
            ))}
            <div style={{ height: 1, background: "#E8E8E4", margin: "8px clamp(16px,4vw,40px)" }} />
            <Link
              href="/affiliate/login"
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "14px clamp(16px,4vw,40px)", fontSize: 15, fontWeight: 600, color: "#1A1A1A", textDecoration: "none" }}
            >
              Affiliate login
            </Link>
            <Link
              href="/admin/login"
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "14px clamp(16px,4vw,40px)", fontSize: 15, fontWeight: 600, color: "#1A1A1A", textDecoration: "none" }}
            >
              Vendor login
            </Link>
            <div style={{ padding: "8px clamp(16px,4vw,40px) 0" }}>
              <Link
                href="/admin/register"
                onClick={() => setOpen(false)}
                style={{ display: "block", padding: "14px 24px", background: "#1A1A1A", color: "white", borderRadius: 100, fontWeight: 800, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", textAlign: "center" }}
              >
                Sell with us
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div onClick={() => setSearchOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, margin: "0 16px" }}>
            <form onSubmit={submitSearch}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: "#BBB" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  ref={searchRef}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                  placeholder="Search products, stores…"
                  style={{ width: "100%", paddingLeft: 56, paddingRight: 60, paddingTop: 18, paddingBottom: 18, borderRadius: 16, border: "none", fontSize: 18, fontWeight: 500, outline: "none", background: "white", color: "#1A1A1A", boxSizing: "border-box", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}
                />
                <button type="submit" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#1A1A1A", color: "white", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}>Search</button>
              </div>
            </form>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 12, textAlign: "center" }}>Press Esc to close</p>
          </div>
        </div>
      )}

      <style>{`
        .tk-nav-links { display: flex !important; }
        .tk-nav-mobile-right { display: none !important; }
        @media (max-width: 900px) {
          .tk-nav-links { display: none !important; }
          .tk-nav-mobile-right { display: flex !important; }
        }
      `}</style>
    </>
  );
}
