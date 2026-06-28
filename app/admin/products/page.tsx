export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";
import Link from "next/link";

export default async function ProductsPage() {
  const vendor = await getVendorFromCookies();
  if (!vendor) redirect("/admin/login");

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    include: {
      variants: { orderBy: { createdAt: "asc" } },
      _count: { select: { orderItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-7">
        <div>
          <div className="eyebrow mb-2" style={{ color: "#999", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Catalog</div>
          <h1 className="font-display" style={{ color: "#1A1A1A", fontSize: "clamp(1.6rem,3vw,2rem)" }}>Products</h1>
        </div>
        <Link href="/admin/products/new"
          className="font-bold px-5 py-3 rounded-2xl transition-transform hover:scale-[1.02]"
          style={{ background: "#c4f23a", color: "#1A1A1A", textDecoration: "none", fontSize: 14 }}>
          + New product
        </Link>
      </div>

      <div className="space-y-3">
        {products.length === 0 && (
          <div className="rounded-3xl p-12 text-center" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <div className="text-4xl mb-4">📦</div>
            <div className="font-display text-xl mb-2" style={{ color: "#1A1A1A" }}>No products yet</div>
            <p className="text-sm mb-5" style={{ color: "#888" }}>Add your first product to start selling.</p>
            <Link href="/admin/products/new"
              className="inline-flex font-bold px-5 py-3 rounded-2xl"
              style={{ background: "#c4f23a", color: "#1A1A1A", textDecoration: "none" }}>
              + Add product
            </Link>
          </div>
        )}

        {products.map((product) => {
          const imgs = product.images ? product.images.split(",").filter(Boolean) : [];
          const totalStock = product.variants.length > 0
            ? product.variants.reduce((s, v) => s + v.stockCount, 0)
            : product.stockCount;
          const lowestPrice = product.basePriceKobo + Math.min(...product.variants.map((v) => v.priceOffset), 0);

          return (
            <div key={product.id}
              className="rounded-3xl p-4 flex items-center gap-4"
              style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 grid place-items-center text-2xl"
                style={{ background: "#F5F5F3" }}>
                {imgs[0]
                  ? <img src={imgs[0]} alt={product.name} className="w-full h-full object-cover" />
                  : "📦"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-display text-sm truncate" style={{ color: "#1A1A1A" }}>{product.name}</div>
                <div className="text-sm mt-0.5" style={{ color: "#1A1A1A" }}>{formatNaira(lowestPrice)}</div>
                <div className="flex gap-3 mt-1 text-xs" style={{ color: "#888" }}>
                  <span>{product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{totalStock} in stock</span>
                  <span>·</span>
                  <span>{product._count.orderItems} sold</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{
                  background: product.isActive ? "#F0FDD4" : "#F5F5F3",
                  color: product.isActive ? "#2D6A00" : "#888",
                }}>
                  {product.isActive ? "Active" : "Hidden"}
                </span>
                <Link href={`/admin/products/${product.id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                  style={{ background: "#fff", color: "#1A1A1A", textDecoration: "none", border: "1px solid #EBEBEB" }}>
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
