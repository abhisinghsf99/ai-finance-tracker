-- Run this once in the Supabase SQL Editor to create the helper functions
-- needed by the MCP server.

-- Returns table/column metadata and foreign key relationships for the public schema.
CREATE OR REPLACE FUNCTION get_schema_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  columns_info jsonb;
  fk_info jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', c.table_name,
      'column_name', c.column_name,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable
    )
    ORDER BY c.table_name, c.ordinal_position
  )
  INTO columns_info
  FROM information_schema.columns c
  WHERE c.table_schema = 'public';

  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', tc.table_name,
      'column_name', kcu.column_name,
      'foreign_table', ccu.table_name,
      'foreign_column', ccu.column_name
    )
  )
  INTO fk_info
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

  RETURN jsonb_build_object(
    'columns', COALESCE(columns_info, '[]'::jsonb),
    'foreign_keys', COALESCE(fk_info, '[]'::jsonb)
  );
END;
$$;

-- Executes a read-only SQL query and returns results as JSON.
-- Has a secondary SELECT-only check as defense in depth (primary validation is in the MCP server).
CREATE OR REPLACE FUNCTION execute_sql(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (trim(lower(query_text)) LIKE 'select%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
    query_text
  ) INTO result;

  RETURN result;
END;
$$;

-- Restrict both functions to service_role only (block anon and authenticated).
REVOKE ALL ON FUNCTION get_schema_info() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_schema_info() TO service_role;

REVOKE ALL ON FUNCTION execute_sql(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
