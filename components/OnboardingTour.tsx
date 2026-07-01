"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Tour steps ───────────────────────────────────────────────────────────────
// target: a data-tour="..." attribute added to the element to highlight.
// placement drives which side the card appears on.
// route: the /admin/* path the element lives on. When the current path doesn't
//   match, the card shows a "Go to …" prompt instead of Next.

interface Step {
  target: string;
  title: string;
  body: string;
  placement: "right" | "bottom" | "top" | "left";
  route: string;
}

const STEPS: Step[] = [
  {
    target: "[data-tour='dashboard-stats']",
    route: "/admin/dashboard",
    placement: "bottom",
    title: "Your store at a glance",
    body: "Total Revenue is everything customers paid. Your Earnings is your share after Teaketer's platform fee. Orders and Affiliates are live counts.",
  },
  {
    target: "[data-tour='dashboard-recent']",
    route: "/admin/dashboard",
    placement: "top",
    title: "Recent orders",
    body: 'Your latest 6 orders appear here. Click "View all →" to open the full orders list with filters and detailed buyer info.',
  },
  {
    target: "[data-tour='nav-products']",
    route: "/admin/dashboard",
    placement: "top",
    title: "Products",
    body: "List what you sell. Add a name, price, images and optional variants (size, colour) — each variant can have its own stock count and price difference.",
  },
  {
    target: "[data-tour='nav-orders']",
    route: "/admin/dashboard",
    placement: "top",
    title: "Orders",
    body: "Every paid order lands here. Click a row to see the full buyer details and copy any field. Mark orders as Fulfilled once dispatched.",
  },
  {
    target: "[data-tour='nav-affiliates']",
    route: "/admin/dashboard",
    placement: "top",
    title: "Affiliates",
    body: "Create referral codes for people who promote your store. They earn a commission on every sale they bring — you set the rate in Settings.",
  },
  {
    target: "[data-tour='nav-settings']",
    route: "/admin/dashboard",
    placement: "top",
    title: "Settings",
    body: "Update your store name, logo, banner, social links, commission rate, bank account, and delivery fees. Let's walk through the most important ones.",
  },
  {
    target: "[data-tour='settings-images']",
    route: "/admin/settings",
    placement: "bottom",
    title: "Logo & banner images",
    body: "Logo: square, at least 400×400 px (shown on your store card on the homepage and beside your store name).\n\nBanner: wide landscape, at least 1200×400 px (fills the top of your storefront page). Use a JPG or PNG under 5 MB for fastest load.",
  },
  {
    target: "[data-tour='settings-commission']",
    route: "/admin/settings",
    placement: "top",
    title: "Affiliate commission rate",
    body: "The percentage affiliates earn per sale they refer. Must be between 5% and 50%. Higher rates attract more promoters. The live example below the input shows exactly how each ₦10,000 order is split.",
  },
  {
    target: "[data-tour='settings-delivery']",
    route: "/admin/settings",
    placement: "top",
    title: "Delivery fees per state",
    body: 'Set a naira fee for each state you ship to. Enter 0 for free delivery to that state. Leave a state blank to block it — buyers in that state will see "Delivery not available" and cannot check out. Click Save fees when done.',
  },
  {
    target: "[data-tour='settings-bank']",
    route: "/admin/settings",
    placement: "top",
    title: "Payout bank account",
    body: "Add your bank and account number here. This creates a Paystack subaccount so your share of every order is automatically split and settled to your account — no manual transfer needed from you or Teaketer.",
  },
];

const DONE_KEY = "tk_tour_done_v1";
const STEP_KEY = "tk_tour_resume_step";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function measureTarget(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return null;
  return { el, rect: el.getBoundingClientRect() };
}

function tooltipPosition(rect: DOMRect, placement: Step["placement"], tipW: number, tipH: number) {
  const GAP = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0, left = 0;

  if (placement === "right") {
    top = rect.top + rect.height / 2 - tipH / 2;
    left = rect.right + GAP;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - tipH / 2;
    left = rect.left - GAP - tipW;
  } else if (placement === "bottom") {
    top = rect.bottom + GAP;
    left = rect.left + rect.width / 2 - tipW / 2;
  } else {
    top = rect.top - GAP - tipH;
    left = rect.left + rect.width / 2 - tipW / 2;
  }

  // Clamp to viewport with 12px margin
  top  = Math.max(12, Math.min(top,  vh - tipH - 12));
  left = Math.max(12, Math.min(left, vw - tipW - 12));

  return { top, left };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingTour({ pathname }: { pathname: string }) {
  const [active, setActive]     = useState(false);
  const [step, setStep]         = useState(0);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);
  const [tipPos, setTipPos]     = useState<{ top: number; left: number } | null>(null);
  const tipRef                  = useRef<HTMLDivElement>(null);
  const rafRef                  = useRef<number | null>(null);

  const current = STEPS[step];
  const onCorrectRoute = pathname.startsWith(current.route);

  // ── measure & position ──────────────────────────────────────────────────────
  const measure = useCallback(() => {
    if (!active || !onCorrectRoute) return;
    const hit = measureTarget(current.target);
    if (!hit) { setHighlight(null); setTipPos(null); return; }
    setHighlight(hit.rect);
    const tipW = tipRef.current?.offsetWidth  ?? 320;
    const tipH = tipRef.current?.offsetHeight ?? 180;
    setTipPos(tooltipPosition(hit.rect, current.placement, tipW, tipH));
  }, [active, onCorrectRoute, current]);

  useEffect(() => {
    if (!active) return;
    // Scroll target into view then measure
    const el = document.querySelector(current.target);
    if (el && onCorrectRoute) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const t = setTimeout(measure, 350);
    return () => clearTimeout(t);
  }, [active, step, measure, current.target, onCorrectRoute]);

  useEffect(() => {
    if (!active) return;
    const update = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  // ── auto-start on first visit (dashboard only) ───────────────────────────
  useEffect(() => {
    if (pathname !== "/admin/dashboard") return;
    if (localStorage.getItem(DONE_KEY)) return;
    const t = setTimeout(() => { setStep(0); setActive(true); }, 900);
    return () => clearTimeout(t);
  }, [pathname]);

  // ── resume after cross-page navigation ───────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem(STEP_KEY);
    if (saved !== null) {
      sessionStorage.removeItem(STEP_KEY);
      const n = parseInt(saved);
      if (!isNaN(n) && n < STEPS.length) {
        setStep(n);
        setActive(true);
      }
    }
  }, []);

  // ── listen for manual "Take the tour" trigger ────────────────────────────
  useEffect(() => {
    function onTrigger() {
      localStorage.removeItem(DONE_KEY);
      setStep(0);
      setActive(true);
    }
    window.addEventListener("tk:start-tour", onTrigger);
    return () => window.removeEventListener("tk:start-tour", onTrigger);
  }, []);

  // ── actions ──────────────────────────────────────────────────────────────
  function dismiss() {
    setActive(false);
    setHighlight(null);
    setTipPos(null);
    localStorage.setItem(DONE_KEY, "1");
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function goToRoute() {
    // Save where we are so the next page can resume
    sessionStorage.setItem(STEP_KEY, String(step));
    window.location.href = current.route;
  }

  if (!active) return null;

  return (
    <>
      {/* ── dim overlay ── */}
      <div
        onClick={dismiss}
        style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.5)" }}
      />

      {/* ── highlight ring ── */}
      {highlight && onCorrectRoute && (
        <div
          style={{
            position: "fixed",
            top:    highlight.top    - 6,
            left:   highlight.left   - 6,
            width:  highlight.width  + 12,
            height: highlight.height + 12,
            zIndex: 9005,
            borderRadius: 14,
            pointerEvents: "none",
            boxShadow: "0 0 0 3px #C4F23A, 0 0 0 9999px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {/* ── tooltip card ── */}
      <div
        ref={tipRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          zIndex: 9006,
          width: 320,
          background: "#1A1A1A",
          color: "#F7EFE2",
          borderRadius: 16,
          padding: "22px 22px 18px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          ...(tipPos
            ? { top: tipPos.top, left: tipPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }),
        }}
      >
        {/* Progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: i === step ? 3 : 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? "#C4F23A" : "rgba(255,255,255,0.15)",
                transition: "flex 0.25s, background 0.2s",
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C4F23A", marginBottom: 6 }}>
          {step + 1} of {STEPS.length}
        </div>

        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>
          {current.title}
        </div>

        {/* Body — supports \n line breaks */}
        <div style={{ fontSize: 13, color: "rgba(247,239,226,0.72)", lineHeight: 1.65, marginBottom: 20, whiteSpace: "pre-line" }}>
          {current.body}
        </div>

        {/* CTA row */}
        {!onCorrectRoute ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={dismiss}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Skip tour
            </button>
            <button
              onClick={goToRoute}
              style={{ padding: "9px 18px", background: "#C4F23A", color: "#1A1A1A", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
            >
              Go to {current.route.replace("/admin/", "")} →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={dismiss}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Skip tour
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={prev}
                  style={{ padding: "9px 16px", background: "rgba(255,255,255,0.1)", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={next}
                style={{ padding: "9px 20px", background: "#C4F23A", color: "#1A1A1A", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                {step === STEPS.length - 1 ? "Done ✓" : "Next →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
