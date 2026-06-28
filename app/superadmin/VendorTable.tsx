"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  email: string;
  storeName: string;
  storeSlug: string;
  businessPageUrl: string;
  isApproved: boolean;
  isActive: boolean;
  createdAt: Date;
  _count: { products: number; orders: number };
  _sum: { totalAmount: number | null };
}

export default function VendorTable({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState(initialVendors);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function toggle(vendorId: string, field: "isApproved" | "isActive", current: boolean) {
    setLoadingId(vendorId);
    try {
      const res = await fetch("/api/superadmin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, [field]: !current }),
      });
      if (res.ok) {
        setVendors((vs) => vs.map((v) => v.id === vendorId ? { ...v, [field]: !current } : v));
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteVendor(vendorId: string) {
    setLoadingId(vendorId);
    try {
      const res = await fetch("/api/superadmin/vendors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      if (res.ok) {
        setVendors((vs) => vs.filter((v) => v.id !== vendorId));
      }
    } finally {
      setLoadingId(null);
      setConfirmDelete(null);
    }
  }

  const pending = vendors.filter((v) => !v.isApproved);
  const approved = vendors.filter((v) => v.isApproved);

  const eyebrow: React.CSSProperties = {
    color: "#888", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.06em", textTransform: "uppercase",
  };

  function VendorRow({ vendor }: { vendor: Vendor }) {
    const busy = loadingId === vendor.id;
    const awaitingConfirm = confirmDelete === vendor.id;

    return (
      <tr style={{ borderBottom: "1px solid #EBEBEB" }}>
        <td className="px-4 py-3.5">
          <div className="font-semibold text-sm" style={{ color: "#1A1A1A" }}>{vendor.storeName}</div>
          <div className="text-xs mt-0.5 font-mono" style={{ color: "#888" }}>/shop/{vendor.storeSlug}</div>
          {vendor.businessPageUrl && (
            <a
              href={vendor.businessPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs mt-1 inline-block"
              style={{ color: "#2D6A00", textDecoration: "underline", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
            >
              {vendor.businessPageUrl}
            </a>
          )}
        </td>
        <td className="px-4 py-3.5">
          <div className="text-sm" style={{ color: "#1A1A1A" }}>{vendor.name}</div>
          <div className="text-xs mt-0.5" style={{ color: "#888" }}>{vendor.email}</div>
        </td>
        <td className="px-4 py-3.5 text-sm" style={{ color: "#888" }}>{vendor._count.products}</td>
        <td className="px-4 py-3.5 text-sm" style={{ color: "#888" }}>{vendor._count.orders}</td>
        <td className="px-4 py-3.5 font-display text-sm" style={{ color: "#1A1A1A" }}>
          {formatNaira(vendor._sum.totalAmount ?? 0)}
        </td>
        <td className="px-4 py-3.5 text-xs" style={{ color: "#888" }}>
          {new Date(vendor.createdAt).toLocaleDateString("en-NG")}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Approve / Revoke */}
            <button
              onClick={() => toggle(vendor.id, "isApproved", vendor.isApproved)}
              disabled={busy}
              className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              style={{
                background: vendor.isApproved ? "#FEF2F2" : "#F0FDD4",
                color: vendor.isApproved ? "#DC2626" : "#2D6A00",
                border: `1px solid ${vendor.isApproved ? "#FECACA" : "#C4F23A"}`,
              }}>
              {busy ? "…" : vendor.isApproved ? "Revoke" : "Approve"}
            </button>
            {/* Suspend / Activate */}
            <button
              onClick={() => toggle(vendor.id, "isActive", vendor.isActive)}
              disabled={busy}
              className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              style={{
                background: vendor.isActive ? "#FEF9EC" : "#F5F5F3",
                color: vendor.isActive ? "#D97706" : "#888",
                border: `1px solid ${vendor.isActive ? "#D97706" : "#EBEBEB"}`,
              }}>
              {busy ? "…" : vendor.isActive ? "Suspend" : "Activate"}
            </button>
            {/* Delete */}
            {awaitingConfirm ? (
              <>
                <button
                  onClick={() => deleteVendor(vendor.id)}
                  disabled={busy}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50"
                  style={{ background: "#DC2626", color: "#fff", border: "none" }}>
                  {busy ? "…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl"
                  style={{ background: "#F5F5F3", color: "#888", border: "1px solid #EBEBEB" }}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(vendor.id)}
                disabled={busy}
                className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Vendors", value: vendors.length, accent: "#c4f23a", ink: "#1A1A1A" },
          { label: "Pending Approval", value: pending.length, accent: "#FEF9EC", ink: "#D97706", border: "#D97706" },
          { label: "Approved", value: approved.length, accent: "#fff", ink: "#1A1A1A", border: "#EBEBEB" },
          { label: "Total Products", value: vendors.reduce((s, v) => s + v._count.products, 0), accent: "#fff", ink: "#1A1A1A", border: "#EBEBEB" },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl p-5" style={{ background: s.accent, border: `1px solid ${(s as { border?: string }).border ?? "transparent"}` }}>
            <div style={{ ...eyebrow, marginBottom: 8, color: s.ink === "#1A1A1A" && s.accent === "#c4f23a" ? "rgba(0,0,0,0.5)" : "#888" }}>{s.label}</div>
            <div className="font-display text-3xl" style={{ color: s.ink }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div style={{ ...eyebrow, marginBottom: 12, color: "#D97706" }}>⏳ Pending Approval ({pending.length})</div>
          <div className="rounded-3xl overflow-hidden" style={{ background: "#FEF9EC", border: "1px solid #D97706" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <TableHead />
                <tbody>{pending.map((v) => <VendorRow key={v.id} vendor={v} />)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* All vendors */}
      <div>
        <div style={{ ...eyebrow, marginBottom: 12 }}>All Vendors ({vendors.length})</div>
        <div className="rounded-3xl overflow-hidden" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>{vendors.map((v) => <VendorRow key={v.id} vendor={v} />)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableHead() {
  const thStyle: React.CSSProperties = {
    color: "#888", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.06em", textTransform: "uppercase",
  };
  return (
    <thead>
      <tr style={{ borderBottom: "1px solid #EBEBEB", background: "#F5F5F3" }}>
        {["Store", "Owner", "Products", "Orders", "Revenue", "Joined", "Actions"].map((h) => (
          <th key={h} className="px-4 py-3 text-left" style={thStyle}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}
