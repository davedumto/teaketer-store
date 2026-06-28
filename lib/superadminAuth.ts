import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(process.env.SUPERADMIN_SECRET!);

export async function getSuperadmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get("sa_token")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.role === "superadmin";
  } catch {
    return false;
  }
}
