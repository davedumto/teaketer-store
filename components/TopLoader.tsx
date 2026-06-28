"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Navigation completed — finish the bar
    if (visible) {
      setWidth(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Expose a start function on window so filter tabs can trigger it
  useEffect(() => {
    (window as Window & { __topLoaderStart?: () => void }).__topLoaderStart = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setWidth(0);
      setVisible(true);
      // Animate to ~80% quickly then stall
      let w = 0;
      const tick = () => {
        w = w < 70 ? w + 4 : w < 85 ? w + 0.5 : w;
        setWidth(w);
        if (w < 85) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    return () => {
      delete (window as Window & { __topLoaderStart?: () => void }).__topLoaderStart;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "#C4F23A",
          transition: width === 100 ? "width 0.15s ease" : "width 0.08s linear",
          boxShadow: "0 0 8px rgba(196,242,58,0.6)",
        }}
      />
    </div>
  );
}
