# vite-sqlts

A Vite plugin that transforms `sql_file` calls to `sql` calls with embedded SQL content at build time.

## Overview

This plugin is designed to work with the `sqlts` library. It eliminates the runtime file I/O overhead of `sql_file` by embedding SQL file contents directly into your JavaScript/TypeScript bundles at build time.

## Installation

```bash
pnpm add -D vite-sqlts
# or
npm install -D vite-sqlts
# or
yarn add -D vite-sqlts
```

## Usage

### 1. Add the plugin to your Vite configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { ViteSqlts } from 'vite-sqlts';

export default defineConfig({
  plugins: [ViteSqlts()],
});
```

### 2. Use sql_file in your code

```typescript
// queries.ts
import { sql_file } from 'sqlts';

interface User {
  id: number;
  name: string;
  email: string;
}

// This will be transformed at build time
const getUserQuery = sql_file<User>`./queries/get-user.sql`;
```

### 3. At build time, the plugin transforms the code

**Before transformation:**
```typescript
const getUserQuery = sql_file<User>`./queries/get-user.sql`;
```

**After transformation:**
```typescript
const getUserQuery = sql<User>`SELECT * FROM users WHERE id = $1`;
```

## How it works

1. The plugin scans your source files for `sql_file` calls
2. It reads the referenced SQL files relative to the importing file
3. It replaces `sql_file` with `sql` and embeds the file content as a template literal
4. The transformed code no longer needs runtime file system access

## Benefits

- **No runtime file I/O**: SQL files are embedded at build time
- **Better performance**: No file system access during execution
- **Bundler-friendly**: Works seamlessly with Vite's bundling process
- **Type-safe**: Preserves TypeScript type parameters
- **Zero runtime overhead**: The transformation happens entirely at build time

## Configuration

The plugin accepts an optional configuration object:

```typescript
interface ViteSqltsOptions {
  /**
   * Include patterns for files to transform
   * @default /\.[jt]sx?$/
   */
  include?: RegExp | RegExp[];

  /**
   * Exclude patterns for files to skip
   * @default /node_modules/
   */
  exclude?: RegExp | RegExp[];
}
```

### Example with custom options

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { ViteSqlts } from 'vite-sqlts';

export default defineConfig({
  plugins: [
    ViteSqlts({
      include: [/\.ts$/, /\.tsx$/], // Only transform .ts and .tsx files
      exclude: [/node_modules/, /\.test\.ts$/], // Skip tests
    }),
  ],
});
```

## Example Project Structure

```
my-app/
├── src/
│   ├── queries/
│   │   ├── get-user.sql
│   │   ├── get-posts.sql
│   │   └── create-user.sql
│   ├── db.ts
│   └── main.ts
├── vite.config.ts
└── package.json
```

**queries/get-user.sql:**
```sql
SELECT * FROM users WHERE id = $1
```

**db.ts:**
```typescript
import { sql_file, type DatabaseClient } from 'sqlts';

interface User {
  id: number;
  name: string;
  email: string;
}

export const getUserQuery = sql_file<User>`./queries/get-user.sql`;

export async function getUser(client: DatabaseClient, id: number) {
  return getUserQuery.bind(id).fetch_one(client);
}
```

After building with Vite, the `sql_file` call will be transformed to embed the SQL content directly.

## Limitations

- SQL file paths must be static strings (template expressions with variables are not supported)
- The plugin runs during the build phase, so changes to SQL files require a rebuild
- Source maps are currently not generated for transformed code

## Development Mode

The plugin works in both development and production modes. In development mode with Vite's HMR, changes to your source files will trigger re-transformation, but changes to SQL files will require a manual reload.

## License

MIT
