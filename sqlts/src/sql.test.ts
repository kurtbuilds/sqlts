import { describe, it, expect } from "vitest";
import { sql, sql_file, Query } from "./index";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

describe("sql", () => {
  it("should create a Query with no arguments", () => {
    const result = sql<User[]>`SELECT * FROM users`;

    expect(result).toBeInstanceOf(Query);
    expect(result.text).toBe("SELECT * FROM users");
    expect(result.values).toEqual([]);
  });

  it("should create a Query with single argument", () => {
    const userId = 42;
    const result = sql<User>`SELECT * FROM users WHERE id = ${userId}`;

    expect(result.text).toBe("SELECT * FROM users WHERE id = $1");
    expect(result.values).toEqual([42]);
  });

  it("should create a Query with multiple arguments", () => {
    const name = "John Doe";
    const email = "john@example.com";
    const result = sql<User>`
      INSERT INTO users (name, email)
      VALUES (${name}, ${email})
      RETURNING *
    `;

    expect(result.text).toContain("INSERT INTO users (name, email)");
    expect(result.text).toContain("VALUES ($1, $2)");
    expect(result.text).toContain("RETURNING *");
    expect(result.values).toEqual(["John Doe", "john@example.com"]);
  });

  it("should handle complex queries with multiple parameters", () => {
    const minId = 10;
    const maxId = 100;
    const status = "active";
    const result = sql<User>`
      SELECT * FROM users
      WHERE id >= ${minId}
        AND id <= ${maxId}
        AND status = ${status}
      ORDER BY id DESC
    `;

    expect(result.text).toContain("WHERE id >= $1");
    expect(result.text).toContain("AND id <= $2");
    expect(result.text).toContain("AND status = $3");
    expect(result.values).toEqual([10, 100, "active"]);
  });

  it("should handle UPDATE queries", () => {
    const newEmail = "newemail@example.com";
    const userId = 5;
    const result = sql<User>`
      UPDATE users
      SET email = ${newEmail}
      WHERE id = ${userId}
      RETURNING *
    `;

    expect(result.text).toContain("SET email = $1");
    expect(result.text).toContain("WHERE id = $2");
    expect(result.values).toEqual(["newemail@example.com", 5]);
  });

  it("should handle DELETE queries", () => {
    const userId = 999;
    const result = sql`DELETE FROM users WHERE id = ${userId}`;

    expect(result.text).toBe("DELETE FROM users WHERE id = $1");
    expect(result.values).toEqual([999]);
  });
});

describe("sql_file", () => {
  it("should read SQL from a file", () => {
    const result = sql_file<User>`test/get-user.sql`;

    expect(result).toBeInstanceOf(Query);
    expect(result.text).toBe("SELECT * FROM users WHERE id = $1");
    expect(result.values).toEqual([]);
  });

  it("should work with bind for parameterized queries", () => {
    const result = sql_file<User>`test/get-user.sql`.bind(123);

    expect(result.text).toBe("SELECT * FROM users WHERE id = $1");
    expect(result.values).toEqual([123]);
  });

  it("should handle files with no parameters", () => {
    const result = sql_file<User>`test/get-all-users.sql`;

    expect(result.text).toBe("SELECT * FROM users ORDER BY created_at DESC");
    expect(result.values).toEqual([]);
  });

  it("should handle JOIN queries with multiple parameters", () => {
    const result = sql_file<Post>`test/get-posts-by-author.sql`.bind(7, 10);

    expect(result.text).toContain("WHERE p.author_id = $1");
    expect(result.text).toContain("LIMIT $2");
    expect(result.values).toEqual([7, 10]);
  });

  it("should work with fetch methods", async () => {
    const mockUser = { id: 123, name: "John", email: "john@example.com" };
    const client = {
      query: async () => ({ rows: [mockUser] }),
    };
    const query = sql_file<User>`test/get-user.sql`.bind(123);

    const result = await query.fetch_one(client);

    expect(result).toEqual(mockUser);
  });
});
