export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SearchResults from "./SearchResults";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center", color: "#BBB", fontSize: 14 }}>
        Loading…
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
