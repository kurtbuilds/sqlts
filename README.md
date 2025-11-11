# sqlts

TypeScript SQL query utilities with type-safe tagged template functions.

# Examples

```typescript
async function main() {
  let pool = await sql.Pool.create({
    url: 'postgres://postgres:password@localhost:5432/mydb',
  });

  // the parameters are parameterized (e.g. ${id} becomes $1) and the parameters
  // are typechecked
  let id = 1;
  let user = await sql<User>`
    SELECT * FROM users WHERE id = ${id}
  `.fetch_one(pool);

  // the parameters are typechecked
  let user = await sql_file<User>("sql/get_user.sql", id)
    .fetch_one(pool);

  let email = 'example@example.com';
  let user: User | null = await sql<User>`SELECT * FROM users WHERE email = ${email}`
    .fetch_optional(pool);

  let active_users: User[] = await sql<User>`SELECT * FROM users WHERE active = true`
    .fetch_all(pool);
}
```

This is compatible with `pg` (node-postgres) and similar libraries.

# Installation

To use the library, install it:

```bash
pnpm add sqlts
```

To inline sql files into your bundle, use the vite plugin:

```bash
pnpm add vite-plugin-sqlts
```

And then add the plugin to your vite config:

```typescript
// vite.config.ts
 import { viteSQLTS } from 'vite-sqlts';

 export default defineConfig({
   plugins: [viteSQLTS()],
 });
```

## For LLMs (AGENTS.md)

```
Use the sqlts library for sql queries.

\`\`\`typescript
import { sql, sql_file } from 'sqlts';
import { Pool } from 'pg';
const pool = new Pool();
const user = await sql<User>`SELECT * FROM users WHERE id = ${userId}`.fetch_one(pool);
const user = await sql_file<User>("./queries/get-user.sql", userId).fetch_one(pool);

// 4. Fetch methods
.fetch_one(client)      // Single row, throws if none
.fetch_all(client)      // Array of rows
.fetch_optional(client) // Single row or null

// 5. Query object has: .text (SQL with $1, $2), .values (array of params)
```
