import { NextRequest, NextResponse } from "next/server";
import { getVendorFromRequest } from "@/lib/vendorAuth";
import { signUploadParams } from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const vendor = await getVendorFromRequest(req);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each vendor gets their own Cloudinary folder for isolation
  const params = signUploadParams(`teaketer-store/${vendor.id}/products`);
  return NextResponse.json(params);
}
