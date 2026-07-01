"use client";

import { useState } from "react";

export default function ShareStoreButton({ storeUrl }: { storeUrl: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "9px 16px",
        background: copied ? "#F0FDD4" : "#F5F5F3",
        border: `1px solid ${copied ? "#C4F23A" : "#E8E8E4"}`,
        borderRadius: 10, cursor: "pointer",
        fontSize: 13, fontWeight: 600,
        color: copied ? "#2D6A00" : "#555",
        transition: "all 0.15s",
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Link copied!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
          Share store link
        </>
      )}
    </button>
  );
}
