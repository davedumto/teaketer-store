"use client";

import { useRouter } from "next/navigation";

export default function SuperadminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/superadmin/logout", { method: "POST" });
    router.push("/superadmin/login");
  }

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(250,250,247,0.92)", backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid #EBEBEB",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BBB" }}>Teaketer</span>
          <span style={{ width: 1, height: 12, background: "#E0E0DB", display: "inline-block" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>Superadmin</span>
        </div>
        <button
          onClick={logout}
          style={{
            fontSize: 12, fontWeight: 700, color: "#888", border: "1px solid #EBEBEB",
            background: "white", borderRadius: 100, padding: "7px 18px", cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
