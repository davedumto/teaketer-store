"use client";

import { useState } from "react";

export default function SuperadminSettings({
  initialEmail,
  initialCommissionBps,
}: {
  initialEmail: string;
  initialCommissionBps: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ total: number; succeeded: number; failed: number } | null>(null);

  const initialCommissionPercent = Number.parseInt(initialCommissionBps, 10) / 100;
  const [savedCommissionPercent, setSavedCommissionPercent] = useState(initialCommissionPercent);
  const [commissionPercent, setCommissionPercent] = useState(initialCommissionPercent.toString());
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionStatus, setCommissionStatus] = useState<"idle" | "ok" | "error">("idle");
  const [commissionError, setCommissionError] = useState("");
  const [pendingCommissionPercent, setPendingCommissionPercent] = useState<number | null>(null);

  function requestSaveCommission() {
    if (commissionSaving || pendingCommissionPercent !== null) return;
    const percent = Number.parseFloat(commissionPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setCommissionStatus("error");
      setCommissionError("Enter a percentage between 0 and 100.");
      return;
    }
    const bps = Math.round(percent * 100);
    if (bps === Math.round(savedCommissionPercent * 100)) {
      setCommissionStatus("idle");
      return; // unchanged — nothing to confirm
    }
    setCommissionStatus("idle");
    setPendingCommissionPercent(percent);
  }

  async function confirmSaveCommission() {
    if (pendingCommissionPercent === null) return;
    const bps = Math.round(pendingCommissionPercent * 100);
    const savedPercent = bps / 100; // normalize to what's actually persisted
    setCommissionSaving(true);
    setCommissionStatus("idle");
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "platform_commission_bps", value: String(bps) }),
      });
      if (res.ok) {
        setCommissionStatus("ok");
        setSavedCommissionPercent(savedPercent);
        setCommissionPercent(savedPercent.toString());
      } else {
        const data = await res.json().catch(() => ({}));
        setCommissionError(data.error ?? "Failed to save.");
        setCommissionStatus("error");
      }
    } catch {
      setCommissionError("Network error.");
      setCommissionStatus("error");
    } finally {
      setCommissionSaving(false);
      setPendingCommissionPercent(null);
    }
  }

  // "Large jump" = new rate is at least double or at most half the current rate
  // (0% -> any positive rate, or any positive rate -> 0%, always counts as large)
  const isLargeCommissionJump =
    pendingCommissionPercent !== null &&
    (savedCommissionPercent === 0
      ? pendingCommissionPercent > 0
      : pendingCommissionPercent === 0 ||
        pendingCommissionPercent >= savedCommissionPercent * 2 ||
        pendingCommissionPercent <= savedCommissionPercent / 2);

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/superadmin/backfill-subaccounts", { method: "POST" });
      const data = await res.json();
      setBackfillResult(data);
    } catch {
      setBackfillResult({ total: -1, succeeded: 0, failed: -1 });
    } finally {
      setBackfilling(false);
    }
  }

  async function save() {
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      return;
    }
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "admin_notification_email", value: email.trim() }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 16, padding: "20px 24px", marginBottom: 32 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#BBB", marginBottom: 12 }}>
        Platform Settings
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#888", marginBottom: 6 }}>
            Admin notification email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="you@example.com"
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E8E8E4", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", color: "#1A1A1A", background: "#FAFAF8", boxSizing: "border-box" as const }}
          />
          <p style={{ margin: "5px 0 0", fontSize: 11, color: "#AAA" }}>
            Receives an alert whenever a new store applies.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 18 }}>
          {status === "ok" && <span style={{ fontSize: 12, color: "#2D6A00", fontWeight: 600 }}>✓ Saved</span>}
          {status === "error" && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>Failed — check the email address</span>}
          <button
            onClick={save}
            disabled={saving}
            style={{ padding: "9px 20px", background: "#1A1A1A", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, whiteSpace: "nowrap" as const }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {/* Platform commission */}
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F0F0EE" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#888", marginBottom: 6 }}>
          Platform Commission
        </div>
        <p style={{ fontSize: 12, color: "#AAA", margin: "0 0 10px" }}>
          The percentage Teaketer takes from every transaction, deducted before the vendor's payout. Applies to all stores immediately — does not affect orders already placed.
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" as const }}>
          <div style={{ width: 140 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#888", marginBottom: 6 }}>
              Commission (%)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={commissionPercent}
                disabled={pendingCommissionPercent !== null || commissionSaving}
                onChange={(e) => { setCommissionPercent(e.target.value); setCommissionStatus("idle"); }}
                onKeyDown={(e) => e.key === "Enter" && requestSaveCommission()}
                style={{ width: "100%", padding: "9px 28px 9px 12px", border: "1.5px solid #E8E8E4", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", color: "#1A1A1A", background: "#FAFAF8", boxSizing: "border-box" as const, opacity: (pendingCommissionPercent !== null || commissionSaving) ? 0.6 : 1 }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#888" }}>%</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 1 }}>
            {commissionStatus === "ok" && <span style={{ fontSize: 12, color: "#2D6A00", fontWeight: 600 }}>✓ Saved</span>}
            {commissionStatus === "error" && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>{commissionError}</span>}
            <button
              onClick={requestSaveCommission}
              disabled={commissionSaving || pendingCommissionPercent !== null}
              style={{ padding: "9px 20px", background: "#1A1A1A", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: (commissionSaving || pendingCommissionPercent !== null) ? "not-allowed" : "pointer", opacity: (commissionSaving || pendingCommissionPercent !== null) ? 0.6 : 1, whiteSpace: "nowrap" as const }}
            >
              {commissionSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {pendingCommissionPercent !== null && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !commissionSaving && setPendingCommissionPercent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 16, padding: "24px 28px", maxWidth: 380, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A", marginBottom: 8 }}>
              Confirm commission change
            </div>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px", lineHeight: 1.5 }}>
              This changes the platform's cut on every transaction, effective immediately for all stores.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: "#FAFAF8", border: "1px solid #EBEBEB", borderRadius: 10, padding: "14px 12px", marginBottom: isLargeCommissionJump ? 12 : 16 }}>
              <div style={{ textAlign: "center" as const }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#AAA", marginBottom: 4 }}>Current</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#888" }}>{savedCommissionPercent}%</div>
              </div>
              <div style={{ fontSize: 18, color: "#CCC" }}>→</div>
              <div style={{ textAlign: "center" as const }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#AAA", marginBottom: 4 }}>New</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A" }}>{pendingCommissionPercent}%</div>
              </div>
            </div>
            {isLargeCommissionJump && (
              <div style={{ display: "flex", gap: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 12px", marginBottom: 16 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 12, color: "#B91C1C", fontWeight: 600, lineHeight: 1.4 }}>
                  This is a large change{savedCommissionPercent > 0 && pendingCommissionPercent > 0 ? ` — more than ${pendingCommissionPercent > savedCommissionPercent ? "double" : "half"} the current rate` : ""}. Double-check this is intentional.
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setPendingCommissionPercent(null)}
                disabled={commissionSaving}
                style={{ padding: "9px 18px", background: "#F5F5F3", color: "#1A1A1A", border: "1px solid #EBEBEB", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: commissionSaving ? "not-allowed" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveCommission}
                disabled={commissionSaving}
                style={{ padding: "9px 18px", background: isLargeCommissionJump ? "#DC2626" : "#1A1A1A", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: commissionSaving ? "not-allowed" : "pointer", opacity: commissionSaving ? 0.6 : 1 }}
              >
                {commissionSaving ? "Saving…" : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backfill Paystack subaccounts */}
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #F0F0EE" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#888", marginBottom: 6 }}>
          Paystack Subaccount Backfill
        </div>
        <p style={{ fontSize: 12, color: "#AAA", margin: "0 0 10px" }}>
          Creates missing Paystack subaccounts for vendors who saved bank details before the fix. Safe to run multiple times — skips vendors already set up.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={runBackfill}
            disabled={backfilling}
            style={{ padding: "9px 20px", background: backfilling ? "#888" : "#1A1A1A", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: backfilling ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}
          >
            {backfilling ? "Running…" : "Run backfill"}
          </button>
          {backfillResult && (
            <span style={{ fontSize: 12, fontWeight: 600, color: backfillResult.failed !== 0 ? "#DC2626" : "#2D6A00" }}>
              {backfillResult.total === -1
                ? "Network error — backfill did not run"
                : backfillResult.total === 0
                ? "✓ All vendors already have subaccounts"
                : backfillResult.failed === 0
                ? `✓ ${backfillResult.succeeded}/${backfillResult.total} subaccounts created`
                : `${backfillResult.succeeded}/${backfillResult.total} done — ${backfillResult.failed} failed (check Paystack account)`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
