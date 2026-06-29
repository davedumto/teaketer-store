"use client";

import { useState } from "react";

export default function SuperadminSettings({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

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
    </div>
  );
}
