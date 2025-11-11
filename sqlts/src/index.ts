import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

/**
 * Database client interface
 */
export interface DatabaseClient {
  query(text: string, values: any[]): Promise<{ rows: any[] }>;
}

/**
 * Query class that represents a SQL query with parameters
 */
export class Query<T = any> {
  private query: string;
  private arguments: any[];

  constructor(query: string, args: any[] = []) {
    this.query = query;
    this.arguments = args;
  }

  /**
   * Get the query text
   */
  get text(): string {
    return this.query;
  }

  /**
   * Get the query values/arguments
   */
  get values(): any[] {
    return this.arguments;
  }

  /**
   * Bind additional parameters to the query
   * @param args - Additional arguments to bind
   * @returns A new Query instance with the additional arguments
   */
  bind(...args: any[]): Query<T> {
    return new Query<T>(this.query, [...this.arguments, ...args]);
  }

  /**
   * Execute the query and fetch a single row
   * @param client - Database client
   * @returns Promise resolving to a single row
   */
  async fetch_one(client: DatabaseClient): Promise<T> {
    const result = await client.query(this.query, this.arguments);
    if (!result.rows[0]) {
      throw new Error("No rows returned from query");
    }
    return result.rows[0];
  }

  /**
   * Execute the query and fetch all rows
   * @param client - Database client
   * @returns Promise resolving to an array of rows
   */
  async fetch_all(client: DatabaseClient): Promise<T[]> {
    const result = await client.query(this.query, this.arguments);
    return result.rows;
  }

  /**
   * Execute the query and fetch an optional single row
   * @param client - Database client
   * @returns Promise resolving to a single row or null
   */
  async fetch_optional(client: DatabaseClient): Promise<T | null> {
    const result = await client.query(this.query, this.arguments);
    return result.rows[0] || null;
  }
}

/**
 * Get the caller's file path from the stack trace
 */
function getCallerDirectory(): string {
  const originalPrepareStackTrace = Error.prepareStackTrace;

  try {
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack as unknown as NodeJS.CallSite[];

    // Find the first stack frame that's not in node_modules and not this file
    for (let i = 0; i < stack.length; i++) {
      const fileName = stack[i]?.getFileName();

      if (!fileName) continue;

      // Handle file:// URLs
      const filePath = fileName.startsWith("file://")
        ? fileURLToPath(fileName)
        : fileName;

      // Skip if it's this file or in node_modules
      if (filePath.includes("node_modules") || filePath.endsWith("index.ts")) {
        continue;
      }

      return dirname(filePath);
    }

    // Fallback to cwd if we couldn't find a suitable frame
    return process.cwd();
  } finally {
    Error.prepareStackTrace = originalPrepareStackTrace;
  }
}

/**
 * Tagged template function for SQL queries
 * @template T - The expected return type of the query
 * @param query - Template string parts
 * @param parameters - Interpolated values
 * @returns A Query instance
 */
export function sql<T = void>(
  query: TemplateStringsArray,
  ...parameters: any[]
): Query<T> {
  const text = query.reduce((acc, str, i) => {
    return acc + str + (i < parameters.length ? `$${i + 1}` : "");
  }, "");

  return new Query<T>(text, parameters);
}

/**
 * Tagged template function for SQL queries from files
 * Reads SQL from a file relative to the caller's directory
 * @template T - The expected return type of the query
 * @param strings - Template string parts (should contain the file path)
 * @param values - Interpolated values (not typically used, file path should be static)
 * @returns A Query instance
 */
export function sql_file<T>(
  strings: TemplateStringsArray,
  ...values: any[]
): Query<T> {
  // Construct the file path from template literal
  const filePath = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || "");
  }, "");

  // Get the caller's directory
  const callerDir = getCallerDirectory();
  console.log(callerDir);

  // Resolve the file path relative to the caller
  const resolvedPath = resolve(callerDir, filePath);
  console.log(resolvedPath);

  // Read the SQL file
  const sqlContent = readFileSync(resolvedPath, "utf-8");

  return new Query<T>(sqlContent, []);
}
