"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import type { VendorPayload } from "@/lib/vendorAuth";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/affiliates", label: "Affiliates" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar({ vendor }: { vendor: VendorPayload }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/vendor/auth/login", { method: "DELETE" });
    router.replace("/admin/login");
  }

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 fixed left-0 top-0 bottom-0 z-30"
      style={{ width: 248, background: "white", borderRight: "1px solid #EBEBEB", minHeight: "100vh" }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #EBEBEB" }}>
        <Link href="/admin/dashboard" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          <Image src="/logo.png" alt="Teaketer" width={120} height={29} style={{ objectFit: "contain", display: "block" }} />
          <div style={{ fontSize: 10, color: "#BBB", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Store Admin</div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px", flex: 1 }}>
        {NAV.map((n) => {
          const on = pathname?.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              style={{
                display: "flex", alignItems: "center", padding: "10px 14px", borderRadius: 8,
                marginBottom: 2, textDecoration: "none", fontSize: 13,
                fontWeight: on ? 700 : 500,
                background: on ? "#F5F5F3" : "transparent",
                color: on ? "#1A1A1A" : "#888",
              }}>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px", borderTop: "1px solid #EBEBEB" }}>
        <div style={{ background: "#F5F5F3", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#BBB", marginBottom: 4 }}>Your store</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vendor.storeName}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vendor.email}</div>
        </div>
        <button onClick={logout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#888", background: "transparent", border: "none", cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
