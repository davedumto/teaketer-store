import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowSec = Math.floor(windowMs / 1000);
  const newResetAt = nowSec + windowSec;

  await prisma.$executeRaw`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${newResetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "resetAt" < ${nowSec} THEN 1            ELSE "count" + 1    END,
      "resetAt" = CASE WHEN "resetAt" < ${nowSec} THEN ${newResetAt} ELSE "resetAt"     END
  `;

  const row = await prisma.rateLimit.findUnique({ where: { key } });
  const count = row?.count ?? 1;
  const resetAt = row?.resetAt ?? newResetAt;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

export function getClientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(1, result.resetAt - Math.floor(Date.now() / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Reset": result.resetAt.toString(),
      },
    }
  );
}
