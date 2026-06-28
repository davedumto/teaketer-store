import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/app/generated/prisma/client";
import path from "path";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!dbUrl.startsWith("file:")) {
    const adapter = new PrismaLibSql({ url: dbUrl, authToken });
    return new PrismaClient({ adapter });
  }

  const filePath = dbUrl.replace(/^file:/, "");
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const adapter = new PrismaLibSql({ url: `file:${absolutePath}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
