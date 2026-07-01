"use client";

import { useState } from "react";

export default function SuperadminSettings({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ total: number; succeeded: number; failed: number } | null>(null);

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
