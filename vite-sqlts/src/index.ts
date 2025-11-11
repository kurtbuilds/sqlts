import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import type { Plugin } from "vite";

export interface ViteSqltsOptions {
  /**
   * Include patterns for files to transform (default: /\.[jt]sx?$/)
   */
  include?: RegExp | RegExp[];
  /**
   * Exclude patterns for files to skip (default: /node_modules/)
   */
  exclude?: RegExp | RegExp[];
}

/**
 * Vite plugin that transforms sql_file calls to sql calls with embedded SQL content
 */
export function ViteSqlts(options: ViteSqltsOptions = {}): Plugin {
  const {
    include = /\.[jt]sx?$/,
    exclude = /node_modules/,
  } = options;

  return {
    name: "vite-sqlts",

    enforce: "pre",

    transform(code: string, id: string) {
      // Check if file should be processed
      const includePatterns = Array.isArray(include) ? include : [include];
      const excludePatterns = Array.isArray(exclude) ? exclude : [exclude];

      if (excludePatterns.some((pattern) => pattern.test(id))) {
        return null;
      }

      if (!includePatterns.some((pattern) => pattern.test(id))) {
        return null;
      }

      // Check if the file contains sql_file calls
      if (!code.includes("sql_file")) {
        return null;
      }

      // Get the directory of the current file
      const fileDir = dirname(id);

      // Regular expression to match sql_file calls
      // Matches: sql_file<Type>`path/to/file.sql`
      // Captures: type parameter (optional) and file path
      const sqlFileRegex = /\bsql_file(?:<([^>]+)>)?`([^`]+)`/g;

      let transformedCode = code;
      let match: RegExpExecArray | null;

      // Reset regex state
      sqlFileRegex.lastIndex = 0;

      while ((match = sqlFileRegex.exec(code)) !== null) {
        const fullMatch = match[0];
        const typeParam = match[1]; // The type parameter, if present
        const filePath = match[2]; // The SQL file path

        try {
          // Resolve the SQL file path relative to the current file
          const resolvedPath = resolve(fileDir, filePath);

          // Read the SQL file content
          const sqlContent = readFileSync(resolvedPath, "utf-8");

          // Escape backticks and backslashes in SQL content for template literal
          const escapedContent = sqlContent
            .replace(/\\/g, "\\\\")
            .replace(/`/g, "\\`")
            .replace(/\$/g, "\\$");

          // Build the replacement
          const typeAnnotation = typeParam ? `<${typeParam}>` : "";
          const replacement = `sql${typeAnnotation}\`${escapedContent}\``;

          // Replace in the code
          transformedCode = transformedCode.replace(fullMatch, replacement);
        } catch (error) {
          // If file cannot be read, log a warning but don't fail the build
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.warn(
            `Failed to read SQL file "${filePath}" in ${id}: ${errorMessage}`
          );
        }
      }

      // Only return if transformations were made
      if (transformedCode !== code) {
        return {
          code: transformedCode,
          map: null, // You could generate a source map here if needed
        };
      }

      return null;
    },
  };
}

export default ViteSqlts;
