import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import type { Plugin } from "vite";

/**
 * Escapes SQL content for use in template literals
 */
function escapeSqlContent(content: string): string {
  return content
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

/**
 * Reads and processes a SQL file
 */
function readSqlFile(filePath: string, baseDir: string): string {
  const resolvedPath = resolve(baseDir, filePath);
  const content = readFileSync(resolvedPath, "utf-8");
  return escapeSqlContent(content);
}

/**
 * Builds the replacement string for sql_file calls
 */
function buildReplacement(
  typeParam: string | undefined,
  sqlContent: string,
  additionalArgs?: string,
): string {
  const typeAnnotation = typeParam ? `<${typeParam}>` : "";

  if (additionalArgs) {
    return `sql${typeAnnotation}(\`${sqlContent}\`, ${additionalArgs})`;
  }
  return `sql${typeAnnotation}\`${sqlContent}\``;
}

/**
 * Adds 'sql' to an existing import statement that contains 'sql_file'
 */
function ensureSqlImport(code: string): string {
  // Skip if sql is already imported
  if (
    /\bsql\b/.test(code.split("\n")[0]) ||
    /import.*\bsql\b.*from/.test(code)
  ) {
    return code;
  }

  // Find and modify sql_file import
  const importRegex =
    /(import\s+{[^}]*)\bsql_file\b([^}]*}.*from\s+['"][^'"]+['"])/m;
  return code.replace(importRegex, "$1sql_file, sql$2");
}

/**
 * Checks if a file should be processed based on include/exclude patterns
 */
function shouldProcessFile(
  id: string,
  include: RegExp | RegExp[],
  exclude: RegExp | RegExp[],
): boolean {
  const includePatterns = Array.isArray(include) ? include : [include];
  const excludePatterns = Array.isArray(exclude) ? exclude : [exclude];

  if (excludePatterns.some((pattern) => pattern.test(id))) return false;
  if (!includePatterns.some((pattern) => pattern.test(id))) return false;

  return true;
}

/**
 * Processes all sql_file calls in code and returns transformed code
 */
function transformSqlFileCalls(
  code: string,
  fileDir: string,
  warn: (msg: string) => void,
): string {
  // Combined regex that matches both syntaxes
  const sqlFileRegex =
    /\bsql_file(?:<([^>]+)>)?(?:`([^`]+)`|\(\s*["']([^"']+)["']\s*(?:,\s*([^)]*))?\s*\))/g;

  return code.replace(
    sqlFileRegex,
    (fullMatch, typeParam, templatePath, functionPath, additionalArgs) => {
      const filePath = templatePath || functionPath;

      console.log(`[vite-sqlts] Found: ${fullMatch}`);

      try {
        const sqlContent = readSqlFile(filePath, fileDir);
        console.log(`[vite-sqlts] Read SQL file (${sqlContent.length} chars)`);

        return buildReplacement(typeParam, sqlContent, additionalArgs?.trim());
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        warn(`Failed to read SQL file "${filePath}": ${errorMessage}`);
        return fullMatch;
      }
    },
  );
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
      if (
        !shouldProcessFile(id, include, exclude) ||
        !code.includes("sql_file")
      ) {
        return null;
      }

      console.log(`[vite-sqlts] Processing file: ${id}`);

      const transformedCode = transformSqlFileCalls(
        code,
        dirname(id),
        this.warn,
      );

      if (transformedCode === code) return null;

      console.log(`[vite-sqlts] Transformation complete for ${id}`);

      return {
        code: ensureSqlImport(transformedCode),
        map: null,
      };
    },
  };
}

export default ViteSqlts;
