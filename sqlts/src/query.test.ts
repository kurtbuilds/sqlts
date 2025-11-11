import { describe, it, expect, vi } from "vitest";
import { sql, DatabaseClient } from "./index";

interface User {
  id: number;
  name: string;
  email: string;
}

// Mock database client
function createMockClient(rows: any[] = []): DatabaseClient {
  return {
    query: vi.fn(async () => ({ rows })),
  };
}

describe("Query.bind()", () => {
  it("should bind additional parameters to a query", () => {
    const query = sql<User>`SELECT * FROM users WHERE id = $1`;
    const bound = query.bind(42);

    expect(bound.text).toBe("SELECT * FROM users WHERE id = $1");
    expect(bound.values).toEqual([42]);
  });

  it("should bind multiple parameters", () => {
    const query = sql<User>`SELECT * FROM users WHERE id = $1 AND status = $2`;
    const bound = query.bind(42, "active");

    expect(bound.values).toEqual([42, "active"]);
  });

  it("should chain multiple bind calls", () => {
    const query = sql<User>`SELECT * FROM users WHERE id = $1 AND status = $2`;
    const bound = query.bind(42).bind("active");

    expect(bound.values).toEqual([42, "active"]);
  });

  it("should not mutate the original query", () => {
    const original = sql<User>`SELECT * FROM users WHERE id = $1`;
    const bound = original.bind(42);

    expect(original.values).toEqual([]);
    expect(bound.values).toEqual([42]);
  });
});

describe("Query.fetch_one()", () => {
  it("should fetch a single row", async () => {
    const mockUser = { id: 1, name: "John", email: "john@example.com" };
    const client = createMockClient([mockUser]);
    const query = sql<User>`SELECT * FROM users WHERE id = $1`.bind(1);

    const result = await query.fetch_one(client);

    expect(result).toEqual(mockUser);
    expect(client.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE id = $1",
      [1],
    );
  });

  it("should throw error when no rows returned", async () => {
    const client = createMockClient([]);
    const query = sql<User>`SELECT * FROM users WHERE id = $1`.bind(999);

    await expect(query.fetch_one(client)).rejects.toThrow(
      "No rows returned from query",
    );
  });
});

describe("Query.fetch_all()", () => {
  it("should fetch all rows", async () => {
    const mockUsers = [
      { id: 1, name: "John", email: "john@example.com" },
      { id: 2, name: "Jane", email: "jane@example.com" },
    ];
    const client = createMockClient(mockUsers);
    const query = sql<User[]>`SELECT * FROM users`;

    const result = await query.fetch_all(client);

    expect(result).toEqual(mockUsers);
    expect(result).toHaveLength(2);
  });

  it("should return empty array when no rows", async () => {
    const client = createMockClient([]);
    const query = sql<User[]>`SELECT * FROM users WHERE status = $1`.bind(
      "inactive",
    );

    const result = await query.fetch_all(client);

    expect(result).toEqual([]);
  });
});

describe("Query.fetch_optional()", () => {
  it("should fetch a single row when exists", async () => {
    const mockUser = { id: 1, name: "John", email: "john@example.com" };
    const client = createMockClient([mockUser]);
    const query = sql<User>`SELECT * FROM users WHERE id = $1`.bind(1);

    const result = await query.fetch_optional(client);

    expect(result).toEqual(mockUser);
  });

  it("should return null when no rows", async () => {
    const client = createMockClient([]);
    const query = sql<User>`SELECT * FROM users WHERE id = $1`.bind(999);

    const result = await query.fetch_optional(client);

    expect(result).toBeNull();
  });
});
