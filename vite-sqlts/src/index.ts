import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import type { Plugin } from "vite";

/**
 * Ensures that 'sql' is imported in the code.
 * If sql_file is imported, adds sql to the same import statement.
 */
function ensureSqlImport(code: string): string {
  // Check if 'sql' is already imported
  if (/\bsql\b/.test(code.split('\n')[0]) || /import.*\bsql\b.*from/.test(code)) {
    // Already has sql imported or used, don't modify
    return code;
  }

  // Find import statement containing sql_file
  const sqlFileImportRegex = /^(import\s+{[^}]*)\bsql_file\b([^}]*}.*from\s+['"][^'"]+['"])/m;
  const match = code.match(sqlFileImportRegex);

  if (match) {
    // Add sql to the existing import that has sql_file
    const before = match[1];
    const after = match[2];

    // Check if sql_file is the only import
    if (before.trim().endsWith('{') && after.trim().startsWith('}')) {
      // { sql_file } => { sql_file, sql }
      return code.replace(sqlFileImportRegex, `${before}sql_file, sql${after}`);
    } else if (before.trim().endsWith(',') || before.includes(',')) {
      // { something, sql_file } => { something, sql_file, sql }
      return code.replace(sqlFileImportRegex, `${before}sql_file, sql${after}`);
    } else {
      // { sql_file } => { sql_file, sql }
      return code.replace(sqlFileImportRegex, `${before}sql_file, sql${after}`);
    }
  }

  // If no sql_file import found, we can't automatically add sql import
  // This shouldn't happen if we transformed sql_file calls
  console.warn('[vite-sqlts] Could not find sql_file import to add sql to');
  return code;
}

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
  const { include = /\.[jt]sx?$/, exclude = /node_modules/ } = options;

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

      console.log(`[vite-sqlts] Processing file: ${id}`);

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

        console.log(`[vite-sqlts] Found: ${fullMatch}`);

        try {
          // Resolve the SQL file path relative to the current file
          const resolvedPath = resolve(fileDir, filePath);

          // Read the SQL file content
          const sqlContent = readFileSync(resolvedPath, "utf-8");

          console.log(`[vite-sqlts] Read SQL file (${sqlContent.length} chars)`);
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
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.warn(
            `Failed to read SQL file "${filePath}" in ${id}: ${errorMessage}`,
          );
        }
      }

      // Only return if transformations were made
      if (transformedCode !== code) {
        // Ensure 'sql' is imported
        transformedCode = ensureSqlImport(transformedCode);

        console.log(`[vite-sqlts] Transformation complete for ${id}`);
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
