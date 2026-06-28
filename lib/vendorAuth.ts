import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "vendor_token";
const AUDIENCE = "vendor";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET_VENDOR;
  if (!s) throw new Error("JWT_SECRET_VENDOR is not set");
  return new TextEncoder().encode(s);
}

export { COOKIE_NAME as VENDOR_COOKIE_NAME };

export interface VendorPayload {
  id: string;
  email: string;
  name: string;
  storeName: string;
  storeSlug: string;
}

export async function signVendorJwt(payload: VendorPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setAudience(AUDIENCE)
    .sign(getSecret());
}

export async function verifyVendorJwt(token: string): Promise<VendorPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUDIENCE });
    return payload as unknown as VendorPayload;
  } catch {
    return null;
  }
}

export async function getVendorFromCookies(): Promise<VendorPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyVendorJwt(token);
}

export async function getVendorFromRequest(req: NextRequest): Promise<VendorPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyVendorJwt(token);
}

export function setVendorCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  const cookieVal = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    isProd ? "Secure" : "",
    "SameSite=Lax",
    "Max-Age=604800",
    "Path=/",
  ].filter(Boolean).join("; ");
  (res.headers as Headers).append("Set-Cookie", cookieVal);
}

export function clearVendorCookie(res: Response): void {
  (res.headers as Headers).append(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`
  );
}
