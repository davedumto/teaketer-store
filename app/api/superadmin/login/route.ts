import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.SUPERADMIN_SECRET!);
const COOKIE = "sa_token";

export async function POST(req: NextRequest) {
  const { pin } = await req.json() as { pin: string };

  if (!pin || pin !== process.env.SUPERADMIN_PIN) {
    await new Promise((r) => setTimeout(r, 400)); // timing-safe delay
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  const token = await new SignJWT({ role: "superadmin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
