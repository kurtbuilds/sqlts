# Example Usage

## Setup

1. Install the plugin in your Vite project:

```bash
pnpm add -D vite-sqlts
```

2. Configure Vite:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { ViteSqlts } from 'vite-sqlts';

export default defineConfig({
  plugins: [ViteSqlts()],
});
```

## Before and After

### Source Code (before build)

```typescript
// src/queries.ts
import { sql_file } from 'sqlts';

interface User {
  id: number;
  name: string;
  email: string;
}

export const getUserQuery = sql_file<User>`./sql/get-user.sql`;
export const getAllUsersQuery = sql_file<User>`./sql/get-all-users.sql`;
```

### SQL Files

```sql
-- src/sql/get-user.sql
SELECT * FROM users WHERE id = $1
```

```sql
-- src/sql/get-all-users.sql
SELECT * FROM users ORDER BY created_at DESC
```

### Transformed Code (after build)

The plugin automatically transforms the code during build:

```typescript
// src/queries.ts (transformed)
import { sql_file } from 'sqlts';

interface User {
  id: number;
  name: string;
  email: string;
}

export const getUserQuery = sql<User>`SELECT * FROM users WHERE id = $1`;
export const getAllUsersQuery = sql<User>`SELECT * FROM users ORDER BY created_at DESC`;
```

## Benefits

1. **No runtime file I/O**: SQL files are embedded at build time
2. **Better performance**: No file system reads during execution
3. **Works in production**: No need to ship SQL files separately
4. **Bundle optimization**: SQL content is part of the bundle
5. **Type-safe**: Preserves all TypeScript type annotations
