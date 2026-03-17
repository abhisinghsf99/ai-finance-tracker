-- ============================================================
-- Query Log — Observability layer for MCP server queries
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Table to log every query Claude executes through the MCP server
CREATE TABLE query_log (
    id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    natural_language_query text,              -- the user's original question
    sql_query             text NOT NULL,      -- the SQL that was executed
    success               boolean NOT NULL,   -- whether the query succeeded
    error_message         text,               -- error details if it failed
    row_count             integer NOT NULL DEFAULT 0,
    execution_time_ms     integer NOT NULL DEFAULT 0,
    tables_referenced     text[] DEFAULT '{}', -- which tables the query touched
    query_category        text,               -- rough topic: spending, balance, etc.
    created_at            timestamptz NOT NULL DEFAULT now()
);

-- Index for time-range analytics ("queries in the last 7 days")
CREATE INDEX idx_query_log_created_at ON query_log(created_at);

-- Index for category breakdowns ("most common query types")
CREATE INDEX idx_query_log_category ON query_log(query_category);

-- RLS: same pattern as all other tables — service_role only
ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on query_log"
    ON query_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- RPC function for the MCP server to insert log entries.
-- SECURITY DEFINER so it runs with the function owner's privileges,
-- matching the pattern of execute_sql and get_schema_info.
CREATE OR REPLACE FUNCTION insert_query_log(
    p_natural_language_query text,
    p_sql_query text,
    p_success boolean,
    p_error_message text,
    p_row_count integer,
    p_execution_time_ms integer,
    p_tables_referenced text[],
    p_query_category text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO query_log (
        natural_language_query, sql_query, success, error_message,
        row_count, execution_time_ms, tables_referenced, query_category
    ) VALUES (
        p_natural_language_query, p_sql_query, p_success, p_error_message,
        p_row_count, p_execution_time_ms, p_tables_referenced, p_query_category
    );
END;
$$;

-- Restrict to service_role only
REVOKE ALL ON FUNCTION insert_query_log(text, text, boolean, text, integer, integer, text[], text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_query_log(text, text, boolean, text, integer, integer, text[], text) TO service_role;
