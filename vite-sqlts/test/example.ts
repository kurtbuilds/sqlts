import { sql_file, sql } from "sqlts";

// Template literal syntax (existing)
const query1 = sql_file<{ id: number; username: string }>`./example.sql`;

// Function call syntax (new)
const query2 = sql_file<{ id: number; username: string }>("./example.sql");

// Function call syntax with additional parameters (new)
const query3 = sql_file<{ id: number; username: string }>("./example.sql", "param1", "param2");

// Template literal syntax without type parameter
const query4 = sql_file`./example.sql`;

// Function call syntax without type parameter
const query5 = sql_file("./example.sql");

// Function call syntax with single quotes
const query6 = sql_file<{ id: number; username: string }>('./example.sql');

// Function call syntax with spaces and additional parameters
const query7 = sql_file<{ id: number; username: string }>( "./example.sql" , { limit: 10 }, true );

export { query1, query2, query3, query4, query5, query6, query7 };
