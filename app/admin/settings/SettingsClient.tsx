"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface VendorData {
  storeName: string;
  storeDescription: string;
  storeSlug: string;
  logoUrl: string;
  bannerUrl: string;
  allowPublicAffiliate: boolean;
  platformFeeBps: number;
  commissionBps: number;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  isApproved: boolean;
  socialInstagram: string;
  socialFacebook: string;
  socialWhatsapp: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#FAFAF8",
  border: "1.5px solid #E8E8E4",
  color: "#1A1A1A",
  borderRadius: 8,
  padding: "12px 16px",
  fontSize: 15,
  fontFamily: "inherit",
};

async function uploadToCloudinary(file: File): Promise<string> {
  const sigRes = await fetch("/api/vendor/upload-signature");
  if (!sigRes.ok) throw new Error("Could not get upload signature.");
  const sig = await sigRes.json();
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", sig.uploadPreset);
  fd.append("folder", sig.folder);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("api_key", sig.apiKey);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload failed.");
  return data.secure_url as string;
}

function ImageUploadField({
  label, hint, value, onChange,
}: { label: string; hint: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <span className="eyebrow block mb-2" style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "#F5F5F3", border: "1px solid #EBEBEB" }}>
          {value
            ? <img src={value} alt={label} className="w-full h-full object-cover" />
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
          }
        </div>
        {/* Upload area */}
        <div className="flex-1">
          <input ref={ref} type="file" accept="image/*" className="sr-only" onChange={handleFile} />
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="w-full text-sm font-semibold py-2.5 px-4 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "#F5F5F3", border: "1px solid #EBEBEB", color: "#1A1A1A" }}>
            {uploading ? "Uploading…" : value ? "Change image" : "Upload image"}
          </button>
          <p className="text-xs mt-1.5" style={{ color: "#999" }}>{hint}</p>
          {value && (
            <button type="button" onClick={() => onChange("")}
              className="text-xs mt-1 font-medium"
              style={{ background: "none", border: "none", color: "#999", cursor: "pointer", padding: 0 }}>
              Remove
            </button>
          )}
          {error && <p className="text-xs mt-1" style={{ color: "#DC2626" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SettingsClient({ vendor }: { vendor: VendorData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    storeName: vendor.storeName,
    storeDescription: vendor.storeDescription,
    logoUrl: vendor.logoUrl,
    bannerUrl: vendor.bannerUrl,
    allowPublicAffiliate: vendor.allowPublicAffiliate,
    commissionPct: String(Math.round(vendor.commissionBps / 100)),
    accountNumber: vendor.accountNumber ?? "",
    bankCode: vendor.bankCode ?? "",
    bankName: vendor.bankName ?? "",
    currentPassword: "",
    newPassword: "",
    socialInstagram: vendor.socialInstagram ?? "",
    socialFacebook: vendor.socialFacebook ?? "",
    socialWhatsapp: vendor.socialWhatsapp ?? "",
  });
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deliveryZones, setDeliveryZones] = useState<{ state: string; feeKobo: number }[]>([]);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState("");

  const NIGERIAN_STATES = [
    "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
    "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
    "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
    "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
    "Yobe","Zamfara",
  ];

  useEffect(() => {
    fetch("/api/banks").then((r) => r.json()).then((d) => setBanks(d.banks ?? []));
    fetch("/api/vendor/delivery-zones")
      .then((r) => r.json())
      .then((d) => setDeliveryZones(d.zones ?? []));
  }, []);

  function getZoneFee(state: string) {
    return deliveryZones.find((z) => z.state === state)?.feeKobo ?? null;
  }

  function setZoneFee(state: string, feeNaira: string) {
    const feeKobo = feeNaira === "" ? null : Math.round(Number(feeNaira) * 100);
    if (feeKobo === null) {
      setDeliveryZones((prev) => prev.filter((z) => z.state !== state));
    } else {
      setDeliveryZones((prev) => {
        const existing = prev.find((z) => z.state === state);
        if (existing) return prev.map((z) => z.state === state ? { ...z, feeKobo } : z);
        return [...prev, { state, feeKobo }];
      });
    }
  }

  async function saveDeliveryZones() {
    setDeliverySaving(true);
    setDeliverySuccess("");
    try {
      const res = await fetch("/api/vendor/delivery-zones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zones: deliveryZones }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDeliverySuccess("Delivery fees saved.");
      setTimeout(() => setDeliverySuccess(""), 3000);
    } catch {
      // keep existing zones, show nothing — minor failure
    } finally {
      setDeliverySaving(false);
    }
  }

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      if (field === "bankCode") {
        const bank = banks.find((b) => b.code === e.target.value);
        if (bank) setForm((f) => ({ ...f, bankCode: bank.code, bankName: bank.name }));
      } else {
        setForm((f) => ({ ...f, [field]: val }));
      }
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    const commissionBps = Math.round(Number(form.commissionPct) * 100);
    if (isNaN(commissionBps) || commissionBps < 500 || commissionBps > 5000) {
      setError("Commission rate must be between 5% and 50%.");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        storeName: form.storeName, storeDescription: form.storeDescription,
        logoUrl: form.logoUrl, bannerUrl: form.bannerUrl,
        allowPublicAffiliate: form.allowPublicAffiliate,
        commissionBps: commissionBps,
        socialInstagram: form.socialInstagram,
        socialFacebook: form.socialFacebook,
        socialWhatsapp: form.socialWhatsapp,
      };
      if (form.accountNumber && form.bankCode) {
        body.accountNumber = form.accountNumber;
        body.bankCode = form.bankCode;
        body.bankName = form.bankName;
      }
      if (form.newPassword) {
        body.newPassword = form.newPassword;
        body.currentPassword = form.currentPassword;
      }
      const res = await fetch("/api/vendor/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed."); return; }
      setSuccess("Settings saved!");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const SectionHeader = ({ label }: { label: string }) => (
    <div className="eyebrow mb-4" style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
  );

  const FieldLabel = ({ label }: { label: string }) => (
    <span className="eyebrow block mb-1.5" style={{ color: "#888", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Store info */}
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <SectionHeader label="Store Information" />
        <div className="space-y-5">
          <div>
            <FieldLabel label="Store Name" />
            <input value={form.storeName} onChange={set("storeName")} className="tk-input" style={inputStyle} />
          </div>
          <div>
            <FieldLabel label="Description" />
            <textarea value={form.storeDescription} onChange={set("storeDescription")} rows={3}
              className="tk-input resize-none" style={inputStyle} />
          </div>

          {/* Logo + Banner side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1" style={{ borderTop: "1px solid #EBEBEB" }}>
            <ImageUploadField
              label="Store Logo"
              hint="Square image, shown on your storefront and marketplace"
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
            />
            <ImageUploadField
              label="Banner Image"
              hint="Wide image displayed at the top of your store page"
              value={form.bannerUrl}
              onChange={(url) => setForm((f) => ({ ...f, bannerUrl: url }))}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative flex-shrink-0">
              <input type="checkbox" checked={form.allowPublicAffiliate}
                onChange={(e) => setForm((f) => ({ ...f, allowPublicAffiliate: e.target.checked }))} className="sr-only" />
              <div className="w-10 h-6 rounded-full transition-colors"
                style={{ background: form.allowPublicAffiliate ? "#c4f23a" : "#E8E8E4" }}>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{ transform: form.allowPublicAffiliate ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
              </div>
            </div>
            <span className="text-sm" style={{ color: "#1A1A1A" }}>Allow public affiliate signups</span>
          </label>

          <div className="rounded-2xl px-4 py-3 text-sm"
            style={{ background: "#F5F5F3", border: "1px solid #EBEBEB", color: "#888" }}>
            Store URL: <span style={{ color: "#1A1A1A" }}>/shop/{vendor.storeSlug}</span>
            {!vendor.isApproved && <span style={{ color: "#D97706" }}> · Pending approval</span>}
          </div>
        </div>
      </div>

      {/* Commission structure */}
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <SectionHeader label="Affiliate Commission Rate" />

        {/* Platform fee — read only */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#FAFAF8", border: "1px solid #EBEBEB" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#BBB", marginBottom: 4 }}>Platform Fee (Teaketer's cut · fixed)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A" }}>{(vendor.platformFeeBps / 100).toFixed(1)}%</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>Deducted from every order. You keep the rest after affiliate commission.</div>
        </div>

        {/* Commission — editable */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#888", display: "block", marginBottom: 6 }}>
            Affiliate Commission Rate
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 180 }}>
              <input
                type="number"
                min={5}
                max={50}
                step={1}
                value={form.commissionPct}
                onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 700, color: "#888" }}>%</span>
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>Minimum 5% · Maximum 50%</div>
          </div>
          <div style={{ marginTop: 12, background: "#F0FDD4", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#2D6A00" }}>
            Example: on a ₦10,000 order → affiliate earns <strong>₦{(10000 * (Number(form.commissionPct) || 0) / 100).toLocaleString()}</strong>, you receive <strong>₦{(10000 * (1 - (vendor.platformFeeBps / 10000) - (Number(form.commissionPct) || 0) / 100)).toLocaleString()}</strong>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#BBB" }}>
            This rate is shown to affiliates before they sign up. Higher rates attract more promoters.
          </div>
        </div>
      </div>

      {/* Delivery fees */}
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <SectionHeader label="Delivery Fees by State" />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {deliverySuccess && <span style={{ fontSize: 12, color: "#2D6A00", fontWeight: 600 }}>✓ {deliverySuccess}</span>}
            <button type="button" onClick={saveDeliveryZones} disabled={deliverySaving}
              style={{ padding: "7px 18px", background: "#1A1A1A", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: deliverySaving ? 0.6 : 1 }}>
              {deliverySaving ? "Saving…" : "Save fees"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
          Set a delivery fee per state. Leave blank to hide that state from buyers (they won&apos;t be able to checkout if you don&apos;t cover their state). Set to 0 for free delivery.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {NIGERIAN_STATES.map((state) => {
            const fee = getZoneFee(state);
            const feeNaira = fee === null ? "" : String(fee / 100);
            return (
              <div key={state}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#999", display: "block", marginBottom: 4 }}>{state}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#888", fontWeight: 600 }}>₦</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={feeNaira}
                    onChange={(e) => setZoneFee(state, e.target.value)}
                    placeholder="—"
                    style={{ ...inputStyle, paddingLeft: 26, fontSize: 13, padding: "8px 10px 8px 26px" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank details */}
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <SectionHeader label="Payout Bank Account" />
        {vendor.accountName && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-sm"
            style={{ background: "#F0FDD4", border: "1px solid #C4F23A", color: "#2D6A00" }}>
            ✓ Linked: {vendor.accountName} — {vendor.bankName} ****{vendor.accountNumber?.slice(-4)}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <FieldLabel label="Bank" />
            <select value={form.bankCode} onChange={set("bankCode")} className="tk-input"
              style={{ ...inputStyle, appearance: "none" }}>
              <option value="" style={{ background: "#fff" }}>Select bank…</option>
              {banks.map((b, i) => <option key={`${b.code}-${i}`} value={b.code} style={{ background: "#fff" }}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel label="Account Number" />
            <input value={form.accountNumber} onChange={set("accountNumber")} maxLength={10}
              className="tk-input" style={inputStyle} placeholder="0123456789" />
          </div>
        </div>
      </div>

      {/* Social links */}
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <SectionHeader label="Social Media" />
        <p className="text-xs mb-4" style={{ color: "#999", marginTop: -8, marginBottom: 16 }}>
          These links appear on your storefront so customers can follow or message you.
        </p>
        <div className="space-y-4">
          {[
            { field: "socialInstagram", label: "Instagram", placeholder: "https://instagram.com/yourstore", icon: "📸" },
            { field: "socialFacebook",  label: "Facebook",  placeholder: "https://facebook.com/yourstore",  icon: "📘" },
            { field: "socialWhatsapp",  label: "WhatsApp",  placeholder: "https://wa.me/2348012345678",     icon: "💬" },
          ].map(({ field, label, placeholder, icon }) => (
            <div key={field}>
              <FieldLabel label={label} />
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15 }}>{icon}</span>
                <input
                  value={form[field as keyof typeof form] as string}
                  onChange={set(field)}
                  className="tk-input"
                  style={{ ...inputStyle, paddingLeft: 40 }}
                  placeholder={placeholder}
                  type="url"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Password change */}
      <div className="rounded-3xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
        <SectionHeader label="Change Password" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Current Password" />
            <input type="password" value={form.currentPassword} onChange={set("currentPassword")}
              className="tk-input" style={inputStyle} placeholder="••••••••" />
          </div>
          <div>
            <FieldLabel label="New Password" />
            <input type="password" value={form.newPassword} onChange={set("newPassword")} minLength={8}
              className="tk-input" style={inputStyle} placeholder="Min. 8 characters" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{
          background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
        }}>{error}</div>
      )}
      {success && (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{
          background: "#F0FDD4", border: "1px solid #C4F23A", color: "#2D6A00",
        }}>{success}</div>
      )}

      <button type="submit" disabled={saving}
        className="w-full font-bold rounded-2xl py-4 transition-transform hover:scale-[1.01] disabled:opacity-50"
        style={{ background: "#1A1A1A", color: "#fff", border: "none", fontSize: 15, borderRadius: 8 }}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
