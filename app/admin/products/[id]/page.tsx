import { redirect, notFound } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import { prisma } from "@/lib/prisma";
import ProductForm from "../ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const vendor = await getVendorFromCookies();
  if (!vendor) redirect("/admin/login");

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, vendorId: vendor.id },
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });
  if (!product) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Edit Product</h1>
      <ProductForm
        productId={product.id}
        initial={{
          name: product.name,
          category: product.category,
          description: product.description,
          images: product.images,
          basePriceKobo: product.basePriceKobo,
          stockCount: product.stockCount,
          isActive: product.isActive,
          variants: product.variants.map((v) => ({
            id: v.id,
            label: v.label,
            priceOffset: v.priceOffset,
            stockCount: v.stockCount,
            sku: v.sku ?? "",
          })),
        }}
      />
    </div>
  );
}
