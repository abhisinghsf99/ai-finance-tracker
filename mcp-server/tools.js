// ============================================================
// Shared MCP Tools & Helpers
// Extracted so both stdio (index.js) and HTTP (server-http.js)
// transports can share the same tool definitions.
// ============================================================

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// --- Environment validation ---

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// --- Supabase client ---

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- SQL validation ---

const FORBIDDEN_PATTERN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|INTO)\b/i;

function validateQuery(sql) {
  const cleaned = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (!cleaned) {
    return "Query is empty";
  }

  if (!/^SELECT\s/i.test(cleaned)) {
    return "Query must be a SELECT statement";
  }

  if (cleaned.includes(";")) {
    return "Query must not contain semicolons";
  }

  const match = cleaned.match(FORBIDDEN_PATTERN);
  if (match) {
    return `Forbidden keyword: ${match[0].toUpperCase()}`;
  }

  return null;
}

// --- Schema formatting ---

function formatSchema(data) {
  const { columns, foreign_keys } = data;

  const tables = {};
  for (const col of columns) {
    if (!tables[col.table_name]) tables[col.table_name] = [];
    tables[col.table_name].push(col);
  }

  let output = "# Database Schema\n\n";
  for (const [table, cols] of Object.entries(tables).sort()) {
    output += `## ${table}\n`;
    for (const col of cols) {
      const nullable = col.is_nullable === "YES" ? ", nullable" : "";
      output += `- ${col.column_name} (${col.data_type}${nullable})\n`;
    }
    output += "\n";
  }

  if (foreign_keys && foreign_keys.length > 0) {
    output += "## Foreign Keys\n";
    for (const fk of foreign_keys) {
      output += `- ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}\n`;
    }
  }

  return output;
}

// --- Query observability ---

const KNOWN_TABLES = ["institutions", "accounts", "transactions", "sync_log", "query_log", "credit_liabilities", "credit_liability_aprs"];

function extractTables(sql) {
  const lower = sql.toLowerCase();
  return KNOWN_TABLES.filter((t) => new RegExp(`\\b${t}\\b`).test(lower));
}

function classifyQuery(sql) {
  const s = sql.toLowerCase();

  if (/\btransfer/i.test(s)) return "transfers";
  if (/\bbalance_(available|current|limit)\b/i.test(s)) return "balance";
  if (/\bmerchant_name\b/i.test(s) && /\bwhere\b/i.test(s)) return "merchant";
  if (
    /\brecurring\b/i.test(s) ||
    (/\bgroup\s+by\b/i.test(s) && /\bhaving\b/i.test(s) && /\bcount\b/i.test(s))
  )
    return "recurring";
  if (/\b(sum|avg|count)\s*\(/i.test(s) && /\bgroup\s+by\b/i.test(s)) return "summary";
  if (/\btransactions\b/i.test(s)) return "spending";

  return null;
}

function logQuery(entry) {
  supabase
    .rpc("insert_query_log", {
      p_natural_language_query: entry.natural_language_query,
      p_sql_query: entry.sql_query,
      p_success: entry.success,
      p_error_message: entry.error_message,
      p_row_count: entry.row_count,
      p_execution_time_ms: entry.execution_time_ms,
      p_tables_referenced: entry.tables_referenced,
      p_query_category: entry.query_category,
    })
    .then(({ error }) => {
      if (error) console.error("Failed to log query:", error.message);
    })
    .catch((err) => {
      console.error("Failed to log query:", err.message);
    });
}

// --- MCP server factory ---

export function createMcpServer() {
  const server = new McpServer({
    name: "financial-assistant",
    version: "1.0.0",
  });

  // Tool: get_schema
  server.registerTool(
    "get_schema",
    {
      description:
        "Returns the full database schema: table names, column names, data types, nullability, and foreign key relationships. Call this first to understand what data is available before writing queries.",
    },
    async () => {
      const { data, error } = await supabase.rpc("get_schema_info");

      if (error) {
        return {
          content: [{ type: "text", text: `Error fetching schema: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: formatSchema(data) }],
      };
    }
  );

  // Tool: execute_query
  server.registerTool(
    "execute_query",
    {
      description:
        "Executes a read-only SQL SELECT query against the financial database. Returns results as JSON. Only SELECT statements are allowed — INSERT, UPDATE, DELETE, DROP, and other write operations are rejected. Call get_schema first to see available tables and columns. Use LIMIT to keep result sets manageable.",
      inputSchema: {
        sql: z.string().describe("The SQL SELECT query to execute"),
        natural_language_query: z
          .string()
          .optional()
          .describe(
            "The original natural language question from the user that prompted this SQL query"
          ),
      },
    },
    async ({ sql, natural_language_query }) => {
      const tables = extractTables(sql);
      const category = classifyQuery(sql);

      const rejection = validateQuery(sql);
      if (rejection) {
        logQuery({
          natural_language_query: natural_language_query || null,
          sql_query: sql,
          success: false,
          error_message: rejection,
          row_count: 0,
          execution_time_ms: 0,
          tables_referenced: tables,
          query_category: category,
        });
        return {
          content: [{ type: "text", text: `Query rejected: ${rejection}` }],
          isError: true,
        };
      }

      const startTime = Date.now();

      const { data, error } = await supabase.rpc("execute_sql", {
        query_text: sql,
      });

      const executionTimeMs = Date.now() - startTime;

      if (error) {
        logQuery({
          natural_language_query: natural_language_query || null,
          sql_query: sql,
          success: false,
          error_message: error.message,
          row_count: 0,
          execution_time_ms: executionTimeMs,
          tables_referenced: tables,
          query_category: category,
        });
        return {
          content: [{ type: "text", text: `Query error: ${error.message}` }],
          isError: true,
        };
      }

      const results = data || [];

      logQuery({
        natural_language_query: natural_language_query || null,
        sql_query: sql,
        success: true,
        error_message: null,
        row_count: results.length,
        execution_time_ms: executionTimeMs,
        tables_referenced: tables,
        query_category: category,
      });

      if (results.length === 0) {
        return {
          content: [{ type: "text", text: "Query returned no results." }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  return server;
}
