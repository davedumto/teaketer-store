"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface Analytics {
  revenueTimeline: { date: string; amount: number }[];
  ordersByState: { state: string; count: number }[];
  topStores: { store: string; gmv: number }[];
  statusBreakdown: { status: string; count: number }[];
  vendorTimeline: { date: string; count: number }[];
  topCategories: { category: string; units: number }[];
}

const LIME = "#C4F23A";
const DARK = "#1A1A1A";
const STATUS_COLORS: Record<string, string> = {
  paid: "#C4F23A",
  fulfilled: "#3AB0F2",
  pending: "#F2C43A",
  cancelled: "#F23A3A",
};

function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

function fmtNaira(v: number) {
  if (v >= 1_000_000_00) return `₦${(v / 1_000_000_00).toFixed(1)}M`;
  if (v >= 1_000_00) return `₦${(v / 1_000_00).toFixed(1)}K`;
  return `₦${(v / 100).toLocaleString()}`;
}

const RANGES = [
  { label: "7d", value: "7" },
  { label: "30d", value: "30" },
  { label: "90d", value: "90" },
];

const tooltipProps = {
  contentStyle: {
    fontSize: 13,
    fontWeight: 500,
    color: "#1A1A1A",
    background: "#fff",
    border: "1px solid #E0E0DB",
    borderRadius: 10,
    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
    padding: "10px 14px",
  },
  labelStyle: { color: "#1A1A1A", fontWeight: 700, marginBottom: 4 },
  itemStyle: { color: "#1A1A1A" },
  cursor: { fill: "rgba(0,0,0,0.04)" },
};

const card: React.CSSProperties = {
  background: "white",
  border: "1px solid #EBEBEB",
  borderRadius: 20,
  padding: "24px",
};

const chartTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: DARK,
  marginBottom: 4,
};

const chartSub: React.CSSProperties = {
  fontSize: 12,
  color: "#999",
  marginBottom: 20,
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/superadmin/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const totalRevenue = data?.revenueTimeline.reduce((s, r) => s + r.amount, 0) ?? 0;
  const totalOrders = data?.statusBreakdown.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <div style={{ padding: "0 0 48px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: DARK, margin: 0, letterSpacing: "-0.02em" }}>Analytics</h2>
          <p style={{ color: "#999", fontSize: 13, margin: "4px 0 0" }}>Platform performance overview</p>
        </div>
        <div style={{ display: "flex", gap: 6, background: "#F4F4F0", borderRadius: 100, padding: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                padding: "6px 16px", borderRadius: 100, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.04em",
                background: range === r.value ? DARK : "transparent",
                color: range === r.value ? "white" : "#888",
                transition: "all 0.15s",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Platform Revenue", value: loading ? "—" : fmtNaira(totalRevenue), sub: `last ${range} days` },
          { label: "Total Orders", value: loading ? "—" : totalOrders.toLocaleString(), sub: "all time" },
          { label: "Paid Orders", value: loading ? "—" : (data?.statusBreakdown.find((s) => s.status === "paid")?.count ?? 0).toLocaleString(), sub: "awaiting fulfilment" },
          { label: "Fulfilled Orders", value: loading ? "—" : (data?.statusBreakdown.find((s) => s.status === "fulfilled")?.count ?? 0).toLocaleString(), sub: "completed" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ ...card, padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999", margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: DARK, margin: "0 0 2px", letterSpacing: "-0.03em" }}>{value}</p>
            <p style={{ fontSize: 11, color: "#BBB", margin: 0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: 14 }}>Loading charts…</div>
      )}

      {!loading && data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* 1. Revenue over time */}
          <div style={{ ...card, gridColumn: "1 / -1" }}>
            <p style={chartTitle}>Platform Revenue over Time</p>
            <p style={chartSub}>Your earnings (platform fee) per day — {range}-day window</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.revenueTimeline} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LIME} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtNaira(v)} tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} width={64} />
                <Tooltip {...tooltipProps} formatter={(v) => [fmtNaira(Number(v)), "Revenue"]} labelFormatter={(l) => `Date: ${l}`} />
                <Area type="monotone" dataKey="amount" stroke={LIME} strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Orders by delivery state */}
          <div style={card}>
            <p style={chartTitle}>Orders by Delivery State</p>
            <p style={chartSub}>Where your customers are shipping to</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.ordersByState.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="count" fill={LIME} radius={[0, 4, 4, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Top stores by GMV */}
          <div style={card}>
            <p style={chartTitle}>Top Stores by Revenue</p>
            <p style={chartSub}>Gross merchandise value per store</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topStores} margin={{ left: 0, right: 16, top: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="store" tick={{ fontSize: 10, fill: "#888" }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} interval={0} />
                <YAxis tickFormatter={(v) => fmtNaira(v)} tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} width={68} />
                <Tooltip {...tooltipProps} formatter={(v) => [fmtNaira(Number(v)), "GMV"]} />
                <Bar dataKey="gmv" fill={DARK} radius={[4, 4, 0, 0]} name="GMV" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Order status donut */}
          <div style={card}>
            <p style={chartTitle}>Order Status Breakdown</p>
            <p style={chartSub}>All-time split across order states</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#E0E0E0"} />
                  ))}
                </Pie>
                <Tooltip {...tooltipProps} formatter={(v, name) => [v, name]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 5. New vendor registrations */}
          <div style={card}>
            <p style={chartTitle}>New Vendor Registrations</p>
            <p style={chartSub}>Store sign-ups over time — growth indicator</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.vendorTimeline} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...tooltipProps} />
                <Line type="monotone" dataKey="count" stroke="#3AB0F2" strokeWidth={2} dot={{ r: 3, fill: "#3AB0F2" }} name="New vendors" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 6. Top product categories */}
          <div style={card}>
            <p style={chartTitle}>Top Product Categories Sold</p>
            <p style={chartSub}>Units sold per category in the selected window</p>
            {data.topCategories.length === 0 ? (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", fontSize: 13 }}>
                No category data yet — vendors need to tag their products.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topCategories} margin={{ left: 0, right: 0, top: 0, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#888" }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#BBB" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip {...tooltipProps} />
                  <Bar dataKey="units" fill={LIME} radius={[4, 4, 0, 0]} name="Units sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
