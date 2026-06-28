import { redirect } from "next/navigation";
import { getVendorFromCookies } from "@/lib/vendorAuth";
import ProductForm from "../ProductForm";

export default async function NewProductPage() {
  const vendor = await getVendorFromCookies();
  if (!vendor) redirect("/admin/login");
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">New Product</h1>
      <ProductForm />
    </div>
  );
}
