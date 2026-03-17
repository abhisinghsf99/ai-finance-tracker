# Financial Assistant MCP Server

MCP server that connects to your Supabase Postgres database and exposes two tools for Claude to query financial data via natural language → SQL.

## Tools

- **get_schema** — Returns table names, columns, types, and foreign keys so Claude knows what's available.
- **execute_query** — Takes a SQL SELECT query, validates it's read-only, executes it, and returns results.

## Setup

### 1. Database functions

Open the Supabase SQL Editor and run the contents of `setup.sql`. This creates two Postgres functions (`get_schema_info` and `execute_sql`) and restricts them to the `service_role` key.

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in your Supabase project URL and service role key.

### 3. Install dependencies

```bash
npm install
```

### 4. Add to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "financial-assistant": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project-id.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

You can either set the env vars in the config above or use the `.env` file (the server loads `dotenv` on startup).

### 5. Test

Restart Claude Desktop. Ask Claude something like "What tables are in my financial database?" — it should call `get_schema` and describe your schema.

## Security

- **SELECT only**: The server parses every query and rejects anything that isn't a pure SELECT (no INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, etc.).
- **No semicolons**: Prevents statement chaining.
- **Comment stripping**: SQL comments are removed before validation so they can't hide forbidden keywords.
- **Postgres-side check**: The `execute_sql` function also verifies the query starts with SELECT as a second layer.
- **Permissions**: Both database functions are restricted to `service_role` — the `anon` and `authenticated` keys cannot call them.
- **Key isolation**: The service role key is never included in tool responses.
