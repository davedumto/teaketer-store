import { prisma } from "@/lib/prisma";

export async function getSiteSetting(key: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ value: string }[]>`
    SELECT value FROM SiteSetting WHERE key = ${key} LIMIT 1
  `;
  return rows[0]?.value ?? null;
}
