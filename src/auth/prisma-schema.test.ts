import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const schemaPath = resolve(process.cwd(), "prisma", "schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

describe("Auth.js Prisma schema contract", () => {
  test("includes the adapter user fields required by auth config", () => {
    expect(schema).toMatch(/model User\s*\{/);
    expect(schema).toMatch(/name\s+String\?/);
    expect(schema).toMatch(/image\s+String\?/);
    expect(schema).toMatch(/emailVerified\s+DateTime\?/);
  });

  test("includes account, session, and verification token models for the Prisma adapter", () => {
    expect(schema).toMatch(/model Account\s*\{/);
    expect(schema).toMatch(/@@unique\(\[provider,\s*providerAccountId\]\)/);
    expect(schema).toMatch(/model Session\s*\{/);
    expect(schema).toMatch(/sessionToken\s+String\s+@unique/);
    expect(schema).toMatch(/model VerificationToken\s*\{/);
    expect(schema).toMatch(/@@unique\(\[identifier,\s*token\]\)/);
  });
});
