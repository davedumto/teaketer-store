export const dynamic = "force-dynamic";

import { getVendorFromCookies } from "@/lib/vendorAuth";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const vendor = await getVendorFromCookies();

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      {vendor && <AdminSidebar vendor={vendor} />}
      <main
        style={{ color: "#1A1A1A" }}
        className={vendor ? "lg:ml-[248px] pb-20 lg:pb-0" : ""}
      >
        {children}
      </main>
    </div>
  );
}
