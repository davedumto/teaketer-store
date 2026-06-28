import { NextResponse } from "next/server";
import { getBanks } from "@/lib/paystack";

// Cache for 1 hour — bank list rarely changes
let cachedBanks: { name: string; code: string }[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cachedBanks && now - cacheTime < CACHE_TTL_MS) {
    return NextResponse.json({ banks: cachedBanks });
  }
  const banks = await getBanks();
  cachedBanks = banks;
  cacheTime = now;
  return NextResponse.json({ banks }, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
