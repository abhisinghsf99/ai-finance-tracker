# Codebase Concerns

**Analysis Date:** 2026-03-10

## Tech Debt

**Duplicate Transaction Mapping Logic:**
- Issue: The `mapTransaction` function is duplicated in two places with identical implementation
- Files: `link-account/server.js` (line 76-96), `webhook/index.js` (line 238-258)
- Impact: Maintenance burden — changes to transaction mapping logic must be made in both places or risk inconsistent behavior between setup and ongoing sync
- Fix approach: Extract `mapTransaction` to a shared utility module or package that both `link-account` and `webhook` import from

**Console Logging Without Structured Logging:**
- Issue: All logging uses `console.log()` and `console.error()`, making it difficult to parse, filter, or aggregate logs in production
- Files: `webhook/index.js` (lines 136-517), `link-account/server.js` (lines 143-389), `mcp-server/server-http.js` (lines 42-116)
- Impact: Production debugging is harder; no log levels, timestamps, or context; harder to integrate with monitoring/alerting
- Fix approach: Replace console logging with a structured logger (e.g., `pino`, `winston`, or `bunyan`). Log JSON with level, timestamp, and structured context fields.

**No Error Recovery for Background Sync:**
- Issue: When `processSync()` fails in the webhook handler, it catches the error and logs it, but never retries. Missed transactions are silently lost.
- Files: `webhook/index.js` (lines 388-390)
- Impact: If a sync fails mid-way (network issue, temporary DB outage, Plaid API error), transactions between failed sync and next webhook are lost
- Fix approach: Implement a retry queue (using a table or external service like Bull/Bee-Queue). Store failed syncs with the item_id and retry with exponential backoff. Log successful retries.

**Missing Transaction Idempotency Safeguards:**
- Issue: Webhook can be called multiple times for the same event. While upsert handles duplicate insertion, there's no guard against partial-sync race conditions.
- Files: `webhook/index.js` (line 274), `link-account/server.js` (line 254)
- Impact: If two sync requests for the same item overlap, account balances could be updated twice with different values, leading to stale reads
- Fix approach: Add a sync lock per institution (e.g., Redis or a database mutex) to ensure only one sync runs at a time per item_id. Include a timeout to handle crashed workers.

**Service Role Key Exposed in HTTP Server:**
- Issue: MCP HTTP server (`server-http.js`) runs authless on port 3001 with full read access to all financial data
- Files: `mcp-server/server-http.js` (line 112)
- Impact: If network is compromised or VPS IP is exposed, anyone can query all transactions without authentication
- Fix approach: Add API key authentication (Bearer token in header). Or restrict to localhost + VPN. Or use mutual TLS. At minimum, document that this must run behind a firewall.

## Known Bugs

**Account Lookup Failure Silently Filtered:**
- Symptoms: If a Plaid account_id doesn't exist in the local accounts table, the transaction is silently skipped with no error
- Files: `webhook/index.js` (line 268), `link-account/server.js` (line 249)
- Trigger: Add an account via Plaid, sync transactions, then manually delete the account from Supabase. Next webhook sync will lose those transactions.
- Workaround: Manually re-sync using `/api/recover` endpoint in link-account server. Verify accounts table before deleting.

**Race Condition: Account Balance Updates During Sync:**
- Symptoms: If two sync requests for different pages overlap, balances could be written out-of-order, leaving stale values
- Files: `webhook/index.js` (lines 318-334)
- Trigger: Very high transaction volume triggering multiple pages in one sync, with slow network
- Workaround: None. Balances are refreshed 1-4x daily anyway per Plaid docs.

**JWT Expiration Clock Skew Not Handled:**
- Symptoms: Webhook verification fails if server clock is ahead of Plaid's clock by more than a few seconds
- Files: `webhook/index.js` (line 113)
- Trigger: Server clock drifts; NTP sync fails
- Workaround: Ensure NTP is configured and running on the VPS

**Recovery File Persisted Plaintext:**
- Symptoms: `.recovery.json` contains the access token in plaintext on disk
- Files: `link-account/server.js` (line 356)
- Trigger: Manual inspection of `.recovery.json`
- Workaround: Encrypt the file at rest or delete `.recovery.json` after successful setup

## Security Considerations

**Plaid Access Token Storage:**
- Risk: Access tokens are stored in the `institutions` table plaintext, readable by anyone with service_role access
- Files: `webhook/index.js` (line 180), `link-account/server.js` (line 180)
- Current mitigation: Supabase RLS restricts table access to service_role only; HTTP server is authless but should be restricted
- Recommendations:
  - Encrypt access tokens at the application level before storing (use a key management service or symmetric encryption)
  - Consider storing only a reference/key that maps to an encrypted vault stored elsewhere
  - Rotate access tokens periodically if Plaid supports it
  - Log all access token reads for audit trail

**SQL Injection in Query Log:**
- Risk: User-supplied SQL is logged as-is to `query_log` RPC without sanitization
- Files: `mcp-server/tools.js` (line 120)
- Current mitigation: Queries are validated server-side to be SELECT-only before logging
- Recommendations:
  - This is acceptable if query validation is strong. Consider also logging a hash of the query for deduplication without storing full text
  - Never log sensitive values (amounts over threshold, patterns that might reveal identity)

**Webhook Signature Verification Has TTL But No Nonce:**
- Risk: A captured webhook could be replayed within the 5-minute window
- Files: `webhook/index.js` (lines 84-126)
- Current mitigation: 5-minute max token age limits replay window
- Recommendations:
  - Store a nonce in a cache (Redis/Memcached) to detect exact replays
  - Consider tracking webhooks by `item_id + webhook_type + timestamp` to reject duplicates

**MCP HTTP Server Missing HTTPS:**
- Risk: If `server-http.js` is exposed (not running behind reverse proxy with TLS), credentials and financial data transit in plaintext
- Files: `mcp-server/server-http.js` (line 106)
- Current mitigation: Documentation should state it must run behind HTTPS
- Recommendations:
  - Add optional self-signed cert support for development
  - In production, must run behind nginx/cloudflare with HTTPS
  - Document this clearly in setup guide

## Performance Bottlenecks

**Transaction Sync Processes Updates Serially:**
- Problem: `updateTransactions()` loops through modified transactions one-by-one with individual database calls
- Files: `webhook/index.js` (lines 283-299)
- Cause: Each modified transaction is updated separately instead of batched
- Improvement path: Batch updates into groups of 100-500 and call upsert once per batch. Could reduce sync time by 10-100x for high-volume accounts.

**Account Map Built Per Sync:**
- Problem: For every sync, we fetch all accounts from Supabase and build an in-memory map
- Files: `webhook/index.js` (line 227), `link-account/server.js` (line 217)
- Cause: No caching between syncs
- Improvement path: If syncs are frequent, cache the account map with a TTL (5-10 min). Invalidate on institution changes. Or pre-compute and store the map on each account upsert.

**JWK Cache Has No Expiration:**
- Problem: Cached JWKs from Plaid are never refreshed, could become stale
- Files: `webhook/index.js` (line 82)
- Cause: No TTL on cache entries
- Improvement path: Add a TTL to cached JWKs (e.g., 1 hour). Refresh on verification failure.

**Query Logging Happens Synchronously:**
- Problem: Every SQL query waits for the query_log RPC to complete before returning results to Claude
- Files: `mcp-server/tools.js` (lines 115-133)
- Cause: `logQuery()` is awaited inline
- Improvement path: Fire logging as a background task (promise without await) so it doesn't block query response

**No Database Indexes on Sync Log:**
- Problem: `sync_log` table has an index on `institution_id`, but if debugging requires looking up syncs by timestamp or cursor, it will scan the full table
- Files: Database schema (project plan, line 199)
- Cause: Indexes were added for known query patterns, but ad-hoc debugging queries may not benefit
- Improvement path: Analyze query patterns from logs and add indexes for the top 3 slow queries

## Fragile Areas

**Webhook Handling with No Deduplication:**
- Files: `webhook/index.js` (lines 369-392)
- Why fragile: Plaid may send the same webhook multiple times due to network retries. While upsert prevents duplicate transactions, concurrent calls can cause race conditions on balance updates and sync cursor updates
- Safe modification: Add a distributed lock (Redis) per item_id before calling `processSync()`. Ensure lock TTL matches expected sync duration + buffer.
- Test coverage: No tests for duplicate webhook scenarios

**Plaid Link OAuth Callback Page (HTML in Express Route):**
- Files: `webhook/index.js` (lines 399-506)
- Why fragile: Large HTML/JS embedded in route handler. Changes to Plaid Link API require editing this embedded script. Hard to test. No syntax highlighting or linting.
- Safe modification: Extract HTML to a separate template file. Use a template engine (EJS, Handlebars) or just serve from `public/` directory.
- Test coverage: No tests for OAuth flow

**Sync Cursor Persistence Without Validation:**
- Files: `webhook/index.js` (lines 198-201)
- Why fragile: Cursor is updated after all pages are processed. If an error occurs during processing of page N, cursor is updated anyway, skipping transactions from page N onward.
- Safe modification: Update cursor only after all adds/updates/removes are confirmed committed to DB. Consider using database transactions.
- Test coverage: No tests for partial sync failures

**Account Upsert Without Validation:**
- Files: `link-account/server.js` (lines 209-214)
- Why fragile: If a Plaid account has no mask/name, the upsert still proceeds, creating incomplete records
- Safe modification: Validate all required fields before upsert. Return error if incomplete.
- Test coverage: No tests for malformed Plaid responses

## Scaling Limits

**Single VPS Webhook Receiver:**
- Current capacity: ~100 webhooks/minute (rough estimate; depends on sync duration)
- Limit: Single Node.js process is CPU-bound during large syncs. No load balancing. No queue.
- Scaling path: Move to a message queue (e.g., RabbitMQ, AWS SQS). VPS receives webhook, enqueues sync job, responds 200 immediately. Workers process queue with retry logic.

**Supabase Free Tier Database:**
- Current capacity: 500MB storage, 2 concurrent connections
- Limit: With multiple institutions, transaction volume will exceed 500MB within 2-3 years
- Scaling path: Monitor storage via Supabase dashboard. Plan upgrade to paid tier when 80% full. Or archive old transactions to cold storage.

**In-Memory JWK Cache:**
- Current capacity: Depends on number of unique Plaid keys (usually 1-5)
- Limit: If Plaid rotates keys frequently, cache could grow unbounded (unlikely but possible)
- Scaling path: Add cache size limit (LRU eviction). Log when cache exceeds N entries.

**Concurrent MCP Query Load:**
- Current capacity: Claude can make multiple queries in parallel, but each query logs synchronously
- Limit: If 100 queries/sec hit the MCP server, logging could become a bottleneck
- Scaling path: Use background logging. Or use batched inserts to query_log.

## Dependencies at Risk

**Plaid SDK Version Pinning:**
- Risk: `plaid` ^28.0.0 in both webhook and link-account. Plaid is actively developed; major API changes could break at next minor upgrade
- Impact: If Plaid releases 28.1.0 with breaking changes, both servers fail
- Migration plan: Monitor Plaid changelog. Use exact versions (~28.0.0) instead of caret (^). Test minor upgrades in staging before production.

**MCP SDK in Early Stages:**
- Risk: `@modelcontextprotocol/sdk` ^1.12.1. MCP is new; API could change significantly
- Impact: Claude context protocol breaking changes would require code rewrites
- Migration plan: Lock version to exact (1.12.1). Monitor Anthropic SDK releases. Plan for breaking changes quarterly.

**Supabase JS Client Version:**
- Risk: `@supabase/supabase-js` ^2.49.4. Breaking changes could happen on major version jumps
- Impact: Auth/connection issues if SDK changes
- Migration plan: Pin to exact version. Test upgrades in isolated environment.

**Express.js Security Patches:**
- Risk: `express` ^4.21.2. Express is mature but regularly receives security patches
- Impact: Unpatched servers could be vulnerable to known exploits
- Migration plan: Set up automated dependency scanning (Dependabot or Snyk). Review security advisories monthly.

## Missing Critical Features

**No Transaction Validation/Enrichment:**
- Problem: Raw Plaid data is stored as-is. No validation that amounts are positive, dates are sensible, or categories are known
- Blocks: Can't implement transaction rules/budgets without knowing data quality
- Fix: Add a validation step after insert. Log validation errors. Consider soft-deleting invalid transactions.

**No Audit Trail for Access Token Requests:**
- Problem: No log of when access tokens are read from DB or used to call Plaid
- Blocks: Can't detect unauthorized token usage
- Fix: Log all token reads with context (which item, what operation, timestamp)

**No Webhook Replay/Retry UI:**
- Problem: If a sync fails, there's no way to retry without hitting a webhook from Plaid again
- Blocks: Recovery from failures requires manual intervention
- Fix: Add a UI or CLI to trigger manual sync for a given item_id

**No Balance Alert System:**
- Problem: No way to detect unusual balance changes or alerts
- Blocks: Can't notify user if account is compromised
- Fix: Add optional threshold-based alerts (balance drops > X%, transaction over Y amount)

**No Multi-User Support:**
- Problem: System assumes single user with access token storage per item_id
- Blocks: Can't extend to shared family accounts or multi-account setup
- Fix: Add user_id foreign key to institutions table. Implement user-based access control in MCP server.

## Test Coverage Gaps

**Webhook Signature Verification:**
- What's not tested: Valid signatures, expired tokens, tampered body, missing header
- Files: `webhook/index.js` (lines 84-126)
- Risk: A bug in verification could allow forged webhooks from attackers
- Priority: High

**Transaction Sync Edge Cases:**
- What's not tested: Empty pages, large batches, duplicate transaction IDs, missing accounts, malformed Plaid responses
- Files: `webhook/index.js` (lines 135-216), `link-account/server.js` (lines 226-283)
- Risk: Partial syncs, silent data loss, infinite loops on bad cursors
- Priority: High

**MCP Query Validation:**
- What's not tested: SQL injection attempts, semicolons in queries, multiline queries, comments, edge cases (nested subqueries, CTEs)
- Files: `mcp-server/tools.js` (lines 29-56)
- Risk: Malicious user could craft a query that bypasses validation and modifies data
- Priority: High

**OAuth Token Exchange:**
- What's not tested: Invalid tokens, expired tokens, mismatched redirect URIs, network errors during exchange
- Files: `link-account/server.js` (lines 343-364)
- Risk: Incomplete setup if exchange fails, leaving partial data in DB
- Priority: Medium

**Account Balance Updates:**
- What's not tested: Null balances, negative balances, currency mismatches, concurrent updates
- Files: `webhook/index.js` (lines 318-334)
- Risk: Stale or incorrect balance display
- Priority: Medium

---

*Concerns audit: 2026-03-10*
