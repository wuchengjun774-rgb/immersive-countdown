import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const dbPath = resolve(process.cwd(), "src", "lib", "db.ts");
const prismaConfigPath = resolve(process.cwd(), "prisma.config.ts");
const packagePath = resolve(process.cwd(), "package.json");

describe("database deployment configuration", () => {
  test("uses the PostgreSQL Prisma adapter instead of the SQLite driver adapter", () => {
    const dbSource = readFileSync(dbPath, "utf8");

    expect(dbSource).not.toContain("@prisma/adapter-better-sqlite3");
    expect(dbSource).not.toContain("PrismaBetterSqlite3");
    expect(dbSource).toContain("@prisma/adapter-pg");
    expect(dbSource).toContain("PrismaPg");
    expect(dbSource).toContain("new PrismaClient({");
  });

  test("requires DATABASE_URL to be supplied by the deployment environment", () => {
    const configSource = readFileSync(prismaConfigPath, "utf8");

    expect(configSource).toContain('process.env["DATABASE_URL"]');
    expect(configSource).not.toContain("file:./prisma/dev.db");
  });

  test("ships the PostgreSQL adapter without the SQLite adapter dependency", () => {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies).not.toHaveProperty("@prisma/adapter-better-sqlite3");
    expect(packageJson.dependencies).toHaveProperty("@prisma/adapter-pg");
  });
});
