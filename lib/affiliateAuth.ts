import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "affiliate_token";
const AUDIENCE = "store-affiliate";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET_AFFILIATE;
  if (!s) throw new Error("JWT_SECRET_AFFILIATE is not set");
  return new TextEncoder().encode(s);
}

export { COOKIE_NAME as AFFILIATE_COOKIE_NAME };

export interface AffiliatePayload {
  id: string;
  email: string;
  name: string;
  vendorId: string;
  storeSlug: string;
  code: string;
}

export async function signAffiliateJwt(payload: AffiliatePayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setAudience(AUDIENCE)
    .sign(getSecret());
}

export async function verifyAffiliateJwt(token: string): Promise<AffiliatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUDIENCE });
    return payload as unknown as AffiliatePayload;
  } catch {
    return null;
  }
}

export async function getAffiliateFromCookies(): Promise<AffiliatePayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAffiliateJwt(token);
}

export async function getAffiliateFromRequest(req: NextRequest): Promise<AffiliatePayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAffiliateJwt(token);
}
