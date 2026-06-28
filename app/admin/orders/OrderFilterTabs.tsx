"use client";

import { useRouter } from "next/navigation";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Cancelled", value: "cancelled" },
];

export default function OrderFilterTabs({ status }: { status: string }) {
  const router = useRouter();

  function navigate(value: string) {
    (window as Window & { __topLoaderStart?: () => void }).__topLoaderStart?.();
    router.push(`/admin/orders${value ? `?status=${value}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {FILTERS.map((f) => {
        const active = status === f.value;
        return (
          <button
            key={f.value}
            onClick={() => navigate(f.value)}
            className="px-4 py-2 rounded-2xl text-sm font-semibold transition-colors"
            style={{
              background: active ? "#1A1A1A" : "#fff",
              color: active ? "#fff" : "#888",
              border: active ? "none" : "1px solid #EBEBEB",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
