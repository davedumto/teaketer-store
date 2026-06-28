import { NextRequest, NextResponse } from "next/server";
import { verifyVendorJwt, VENDOR_COOKIE_NAME } from "@/lib/vendorAuth";
import { verifyAffiliateJwt, AFFILIATE_COOKIE_NAME } from "@/lib/affiliateAuth";
import { jwtVerify } from "jose";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/register"];
const SA_SECRET = () => new TextEncoder().encode(process.env.SUPERADMIN_SECRET!);

async function verifySaToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SA_SECRET());
    return payload.role === "superadmin";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Superadmin pages ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/superadmin") && !pathname.startsWith("/superadmin/login")) {
    const token = req.cookies.get("sa_token")?.value;
    if (!token || !(await verifySaToken(token))) {
      return NextResponse.redirect(new URL("/superadmin/login", req.url));
    }
    return NextResponse.next();
  }

  // ── Superadmin API routes ─────────────────────────────────────────────────────
  if (pathname.startsWith("/api/superadmin") && !pathname.startsWith("/api/superadmin/login")) {
    const token = req.cookies.get("sa_token")?.value;
    if (!token || !(await verifySaToken(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ── Vendor admin pages ────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get(VENDOR_COOKIE_NAME)?.value;
    if (!token || !(await verifyVendorJwt(token))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // Redirect already-authenticated vendors away from login/register
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get(VENDOR_COOKIE_NAME)?.value;
    if (token && (await verifyVendorJwt(token))) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  // ── Vendor API routes ─────────────────────────────────────────────────────────
  if (
    pathname.startsWith("/api/vendor") &&
    !pathname.startsWith("/api/vendor/auth/login") &&
    !pathname.startsWith("/api/vendor/auth/register")
  ) {
    const token = req.cookies.get(VENDOR_COOKIE_NAME)?.value;
    if (!token || !(await verifyVendorJwt(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // ── Affiliate dashboard pages ─────────────────────────────────────────────────
  // Public: /affiliate/login, /affiliate/[slug]/login
  // Protected: /affiliate/[slug] (the dashboard)
  if (pathname.startsWith("/affiliate/") && !pathname.endsWith("/login") && pathname !== "/affiliate/login") {
    const segments = pathname.split("/"); // ["", "affiliate", slug, ...]
    const slug = segments[2];
    // Only the dashboard root needs a gate — sub-paths like /login are already excluded
    if (slug && segments.length === 3) {
      const token = req.cookies.get(AFFILIATE_COOKIE_NAME)?.value;
      if (!token || !(await verifyAffiliateJwt(token))) {
        return NextResponse.redirect(new URL(`/affiliate/${slug}/login`, req.url));
      }
    }
    return NextResponse.next();
  }

  // ── Affiliate API routes (auth-required endpoints) ────────────────────────────
  if (
    pathname.startsWith("/api/affiliates/me") ||
    pathname.startsWith("/api/affiliates/convert")
  ) {
    const token = req.cookies.get(AFFILIATE_COOKIE_NAME)?.value;
    if (!token || !(await verifyAffiliateJwt(token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*",
    "/affiliate/:path*",
    "/api/vendor/:path*",
    "/api/superadmin/:path*",
    "/api/affiliates/me",
    "/api/affiliates/convert",
  ],
};
