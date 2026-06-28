"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function OrderStatusPoller({
  reference,
  slug,
}: {
  reference: string;
  slug: string;
}) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      attempts.current += 1;
      if (attempts.current > 5) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/store/orders/${reference}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.order?.status !== "pending") {
          clearInterval(interval);
          router.refresh();
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [reference, slug, router]);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-center text-sm text-yellow-700">
      Verifying payment… this page will update automatically.
    </div>
  );
}
