import { describe, it, expect, beforeAll } from "vitest";
import { ViteSqlts } from "./index";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";

const TEST_DIR = resolve(__dirname, "__test__");
const TEST_SQL_FILE = resolve(TEST_DIR, "query.sql");

describe("ViteSqlts", () => {
  beforeAll(() => {
    // Create test directory and SQL file
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_SQL_FILE, "SELECT * FROM users WHERE id = $1");
  });

  it("should transform sql_file to sql with embedded content", () => {
    const plugin = ViteSqlts();
    const code = `
      import { sql_file } from "sqlts";
      const query = sql_file<User>\`__test__/query.sql\`;
    `;

    const result = plugin.transform?.call(
      { warn: () => {} } as any,
      code,
      resolve(__dirname, "test.ts")
    );

    expect(result).toBeTruthy();
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).toContain("sql<User>");
      expect(result.code).toContain("SELECT * FROM users WHERE id = \\$1");
      // Check that the function call (not import) was transformed
      expect(result.code).toMatch(/const query = sql<User>`/);
      expect(result.code).not.toMatch(/sql_file<User>`__test__\/query\.sql`/);
    }
  });

  it("should transform sql_file without type parameter", () => {
    const plugin = ViteSqlts();
    const code = `
      import { sql_file } from "sqlts";
      const query = sql_file\`__test__/query.sql\`;
    `;

    const result = plugin.transform?.call(
      { warn: () => {} } as any,
      code,
      resolve(__dirname, "test.ts")
    );

    expect(result).toBeTruthy();
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).toContain("sql`");
      expect(result.code).toContain("SELECT * FROM users WHERE id = \\$1");
      // Check that the function call (not import) was transformed
      expect(result.code).toMatch(/const query = sql`/);
      expect(result.code).not.toMatch(/sql_file`__test__\/query\.sql`/);
    }
  });

  it("should handle multiple sql_file calls", () => {
    const plugin = ViteSqlts();
    writeFileSync(resolve(TEST_DIR, "query2.sql"), "DELETE FROM users WHERE id = $1");

    const code = `
      import { sql_file } from "sqlts";
      const query1 = sql_file<User>\`__test__/query.sql\`;
      const query2 = sql_file<void>\`__test__/query2.sql\`;
    `;

    const result = plugin.transform?.call(
      { warn: () => {} } as any,
      code,
      resolve(__dirname, "test.ts")
    );

    expect(result).toBeTruthy();
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).toContain("sql<User>");
      expect(result.code).toContain("sql<void>");
      expect(result.code).toContain("SELECT * FROM users WHERE id = \\$1");
      expect(result.code).toContain("DELETE FROM users WHERE id = \\$1");
      // Check that the function calls (not import) were transformed
      expect(result.code).toMatch(/const query1 = sql<User>`/);
      expect(result.code).toMatch(/const query2 = sql<void>`/);
      expect(result.code).not.toMatch(/sql_file<User>`__test__\/query\.sql`/);
      expect(result.code).not.toMatch(/sql_file<void>`__test__\/query2\.sql`/);
    }
  });

  it("should return null for files without sql_file", () => {
    const plugin = ViteSqlts();
    const code = `
      import { sql } from "sqlts";
      const query = sql<User>\`SELECT * FROM users\`;
    `;

    const result = plugin.transform?.call(
      { warn: () => {} } as any,
      code,
      resolve(__dirname, "test.ts")
    );

    expect(result).toBeNull();
  });

  it("should exclude node_modules by default", () => {
    const plugin = ViteSqlts();
    const code = `
      const query = sql_file<User>\`query.sql\`;
    `;

    const result = plugin.transform?.call(
      { warn: () => {} } as any,
      code,
      "/path/to/node_modules/some-package/index.js"
    );

    expect(result).toBeNull();
  });

  it("should escape special characters in SQL content", () => {
    const plugin = ViteSqlts();
    const specialSqlFile = resolve(TEST_DIR, "special.sql");
    writeFileSync(specialSqlFile, "SELECT `column` FROM users WHERE name = '\\test'");

    const code = `
      const query = sql_file\`__test__/special.sql\`;
    `;

    const result = plugin.transform?.call(
      { warn: () => {} } as any,
      code,
      resolve(__dirname, "test.ts")
    );

    expect(result).toBeTruthy();
    if (result && typeof result === "object" && "code" in result) {
      expect(result.code).toContain("sql`");
      // Check that backticks and backslashes are properly escaped
      expect(result.code).toContain("\\`column\\`");
      expect(result.code).toContain("\\\\test");
    }
  });
});
