// ============================================================
// Plaid Webhook Receiver
// Receives SYNC_UPDATES_AVAILABLE webhooks from Plaid,
// fetches new/modified/removed transactions via /transactions/sync,
// and writes everything to Supabase.
// ============================================================

import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";

// ============================================================
// 1. ENVIRONMENT VALIDATION
// Fail fast if any required variable is missing — better to
// crash on startup than silently malfunction at runtime.
// ============================================================

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_ENV,
} = process.env;

const required = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_ENV,
};

const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ============================================================
// 2. CLIENT INITIALIZATION
// Supabase uses the service_role key to bypass RLS (same
// pattern as the MCP server). Plaid client is configured
// with credentials passed via headers per their SDK convention.
// ============================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
      "PLAID-SECRET": PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

// ============================================================
// 3. PLAID WEBHOOK SIGNATURE VERIFICATION
// Plaid signs every webhook with a JWT in the Plaid-Verification
// header. We must:
//   a) Decode the JWT header to get the key ID (kid)
//   b) Fetch the public key from Plaid's /webhook_verification_key/get
//   c) Verify the JWT signature
//   d) Compare the SHA-256 hash of the raw request body against
//      the request_body_sha256 claim in the JWT payload
//
// This prevents forged webhooks from unauthorized senders.
// ============================================================

// Cache verified JWKs to avoid fetching the same key repeatedly.
// Keys are keyed by their kid (Key ID).
const jwkCache = new Map();

async function verifyPlaidWebhook(req) {
  const token = req.headers["plaid-verification"];
  if (!token) {
    throw new Error("Missing Plaid-Verification header");
  }

  // Decode the JWT header (without verifying) to extract the key ID
  const jwtHeader = decodeProtectedHeader(token);
  const kid = jwtHeader.kid;

  if (!kid) {
    throw new Error("JWT header missing kid");
  }

  // Fetch the signing key from Plaid (or use cache)
  let key = jwkCache.get(kid);
  if (!key) {
    const response = await plaidClient.webhookVerificationKeyGet({
      key_id: kid,
    });
    key = response.data.key;
    jwkCache.set(kid, key);
  }

  // Import the JWK for use with jose
  const publicKey = await importJWK(key, jwtHeader.alg);

  // Verify the JWT signature and that it's not expired (5 min max age)
  const { payload } = await jwtVerify(token, publicKey, {
    maxTokenAge: "5 min",
  });

  // Compute SHA-256 of the raw request body and compare to the JWT claim.
  // This ensures the body wasn't tampered with in transit.
  const bodyHash = crypto
    .createHash("sha256")
    .update(req.rawBody)
    .digest("hex");

  if (payload.request_body_sha256 !== bodyHash) {
    throw new Error("Request body hash mismatch");
  }
}

// ============================================================
// 4. TRANSACTION SYNC LOGIC
// When Plaid sends SYNC_UPDATES_AVAILABLE, we call
// /transactions/sync in a loop (handling pagination via has_more)
// to fetch all new, modified, and removed transactions.
// ============================================================

async function processSync(itemId) {
  console.log(`[sync] Starting sync for item_id: ${itemId}`);

  // Look up the institution by Plaid's item_id to get the
  // access token and current cursor position.
  const { data: institution, error: lookupError } = await supabase
    .from("institutions")
    .select("id, plaid_access_token, sync_cursor")
    .eq("plaid_item_id", itemId)
    .single();

  if (lookupError || !institution) {
    console.error(`[sync] Institution not found for item_id ${itemId}:`, lookupError?.message);
    return;
  }

  let cursor = institution.sync_cursor;
  const cursorBefore = cursor;
  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  // Pagination loop — Plaid may split large syncs into multiple pages.
  // Each call returns a next_cursor; we keep going until has_more is false.
  while (hasMore) {
    const syncRequest = { access_token: institution.plaid_access_token };
    if (cursor) syncRequest.cursor = cursor;

    const response = await plaidClient.transactionsSync(syncRequest);
    const { added, modified, removed, accounts, next_cursor, has_more } = response.data;

    console.log(
      `[sync] Page: +${added.length} added, ~${modified.length} modified, -${removed.length} removed`
    );

    // Process each category of changes
    if (added.length > 0) {
      await insertTransactions(added, institution.id);
      totalAdded += added.length;
    }

    if (modified.length > 0) {
      await updateTransactions(modified, institution.id);
      totalModified += modified.length;
    }

    if (removed.length > 0) {
      await removeTransactions(removed);
      totalRemoved += removed.length;
    }

    // Update account balances from the accounts array.
    // Plaid returns current balances with every sync response.
    if (accounts && accounts.length > 0) {
      await updateAccountBalances(accounts);
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  // Persist the new cursor so the next sync starts where we left off
  await supabase
    .from("institutions")
    .update({ sync_cursor: cursor })
    .eq("id", institution.id);

  // Log the sync event for debugging and audit trail
  await supabase.from("sync_log").insert({
    institution_id: institution.id,
    transactions_added: totalAdded,
    transactions_modified: totalModified,
    transactions_removed: totalRemoved,
    cursor_before: cursorBefore,
    cursor_after: cursor,
  });

  console.log(
    `[sync] Complete for ${itemId}: +${totalAdded} ~${totalModified} -${totalRemoved}`
  );

  // Sync credit card liabilities after transaction sync
  await syncLiabilities(itemId).catch((err) => {
    console.error(`[sync] Liabilities sync failed for ${itemId}:`, err.message);
  });
}

// ============================================================
// 4b. CREDIT CARD LIABILITIES SYNC
// Calls Plaid's /liabilities/get and upserts data to Supabase.
// ============================================================

async function syncLiabilities(itemId) {
  console.log(`[liabilities] Starting sync for item_id: ${itemId}`);

  const { data: institution, error: lookupError } = await supabase
    .from("institutions")
    .select("id, plaid_access_token")
    .eq("plaid_item_id", itemId)
    .single();

  if (lookupError || !institution) {
    console.error(`[liabilities] Institution not found for item_id ${itemId}:`, lookupError?.message);
    return;
  }

  let liabilitiesResponse;
  try {
    liabilitiesResponse = await plaidClient.liabilitiesGet({
      access_token: institution.plaid_access_token,
    });
  } catch (err) {
    const errorCode = err?.response?.data?.error_code;

    // Not all items support liabilities (e.g. depository-only).
    if (errorCode === "PRODUCTS_NOT_SUPPORTED") {
      console.log(`[liabilities] Skipping — liabilities not supported for ${itemId}`);
      return;
    }

    // Product not enabled — user needs to re-link or use update mode
    if (err?.response?.status === 400) {
      console.log(`[liabilities] Liabilities product not enabled for ${itemId}.`);
      console.log(`[liabilities] Run the link-account server with: node server.js --add-liabilities`);
      return;
    }

    throw err;
  }

  const creditLiabilities = liabilitiesResponse.data.liabilities?.credit || [];
  if (creditLiabilities.length === 0) {
    console.log(`[liabilities] No credit liabilities for ${itemId}`);
    return;
  }

  // Build plaid_account_id → UUID map
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, plaid_account_id")
    .eq("institution_id", institution.id);

  const accountMap = new Map((accounts || []).map((a) => [a.plaid_account_id, a.id]));

  for (const liability of creditLiabilities) {
    const accountId = accountMap.get(liability.account_id);
    if (!accountId) {
      console.warn(`[liabilities] No account found for plaid_account_id ${liability.account_id}`);
      continue;
    }

    // Upsert credit liability
    const { data: upserted, error: upsertError } = await supabase
      .from("credit_liabilities")
      .upsert(
        {
          account_id: accountId,
          is_overdue: liability.is_overdue ?? null,
          last_payment_amount: liability.last_payment_amount ?? null,
          last_payment_date: liability.last_payment_date ?? null,
          last_statement_issue_date: liability.last_statement_issue_date ?? null,
          last_statement_balance: liability.last_statement_balance ?? null,
          minimum_payment_amount: liability.minimum_payment_amount ?? null,
          next_payment_due_date: liability.next_payment_due_date ?? null,
        },
        { onConflict: "account_id" }
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error(`[liabilities] Upsert error for account ${accountId}:`, upsertError.message);
      continue;
    }

    // Replace APRs: delete existing, then insert new
    await supabase
      .from("credit_liability_aprs")
      .delete()
      .eq("credit_liability_id", upserted.id);

    if (liability.aprs && liability.aprs.length > 0) {
      const aprRows = liability.aprs.map((apr) => ({
        credit_liability_id: upserted.id,
        apr_percentage: apr.apr_percentage,
        apr_type: apr.apr_type,
        balance_subject_to_apr: apr.balance_subject_to_apr ?? null,
        interest_charge_amount: apr.interest_charge_amount ?? null,
      }));

      const { error: aprError } = await supabase
        .from("credit_liability_aprs")
        .insert(aprRows);

      if (aprError) {
        console.error(`[liabilities] APR insert error for liability ${upserted.id}:`, aprError.message);
      }
    }
  }

  console.log(`[liabilities] Complete for ${itemId}: ${creditLiabilities.length} liabilities synced`);
}

// ============================================================
// 5. DATABASE OPERATIONS
// Each function handles one type of change from /transactions/sync.
// We look up plaid_account_id → account_id (UUID) to satisfy
// the foreign key in the transactions table.
// ============================================================

// Build a map of plaid_account_id → UUID for an institution.
// Used by insert and update to resolve foreign keys.
async function getAccountMap(institutionId) {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, plaid_account_id")
    .eq("institution_id", institutionId);

  return new Map((accounts || []).map((a) => [a.plaid_account_id, a.id]));
}

// Map a Plaid transaction object to our database row format.
// personal_finance_category.primary/detailed → category_primary/category_detailed
function mapTransaction(t, accountMap) {
  return {
    plaid_transaction_id: t.transaction_id,
    account_id: accountMap.get(t.account_id),
    amount: t.amount,
    date: t.date,
    datetime: t.datetime || null,
    name: t.name,
    merchant_name: t.merchant_name || null,
    merchant_entity_id: t.merchant_entity_id || null,
    category_primary: t.personal_finance_category?.primary || null,
    category_detailed: t.personal_finance_category?.detailed || null,
    payment_channel: t.payment_channel || null,
    is_pending: t.pending || false,
    pending_transaction_id: t.pending_transaction_id || null,
    iso_currency_code: t.iso_currency_code || "USD",
    logo_url: t.logo_url || null,
    website: t.website || null,
    raw_data: t,
  };
}

// INSERT new transactions. Uses upsert with onConflict to handle
// duplicate webhooks gracefully — if a transaction_id already exists,
// it updates instead of failing.
async function insertTransactions(transactions, institutionId) {
  const accountMap = await getAccountMap(institutionId);

  const rows = transactions
    .map((t) => mapTransaction(t, accountMap))
    .filter((r) => r.account_id); // skip if account not found

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("transactions")
    .upsert(rows, { onConflict: "plaid_transaction_id" });

  if (error) {
    console.error("[sync] Insert transactions error:", error.message);
  }
}

// UPDATE modified transactions. Plaid sends the full updated
// transaction object, so we overwrite all fields.
async function updateTransactions(transactions, institutionId) {
  const accountMap = await getAccountMap(institutionId);

  for (const t of transactions) {
    const row = mapTransaction(t, accountMap);
    if (!row.account_id) continue;

    const { error } = await supabase
      .from("transactions")
      .update(row)
      .eq("plaid_transaction_id", t.transaction_id);

    if (error) {
      console.error(`[sync] Update transaction ${t.transaction_id} error:`, error.message);
    }
  }
}

// DELETE removed transactions. Plaid sends an array of objects
// with transaction_id fields for transactions that no longer exist.
async function removeTransactions(removed) {
  const ids = removed.map((r) => r.transaction_id);

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("plaid_transaction_id", ids);

  if (error) {
    console.error("[sync] Remove transactions error:", error.message);
  }
}

// UPDATE account balances. Plaid includes current balance info
// in every /transactions/sync response.
async function updateAccountBalances(accounts) {
  for (const account of accounts) {
    const { error } = await supabase
      .from("accounts")
      .update({
        balance_available: account.balances.available,
        balance_current: account.balances.current,
        balance_limit: account.balances.limit,
        balance_updated_at: new Date().toISOString(),
      })
      .eq("plaid_account_id", account.account_id);

    if (error) {
      console.error(`[sync] Update balance ${account.account_id} error:`, error.message);
    }
  }
}

// ============================================================
// 6. EXPRESS APP & ROUTES
// ============================================================

const app = express();

// Parse JSON bodies AND capture the raw buffer for webhook
// signature verification (we need the exact bytes to compute
// the SHA-256 hash that Plaid's JWT claims).
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// --- Health check ---
// Simple endpoint for monitoring. PM2, uptime checks, and
// our own verification can hit this to confirm the server is alive.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- Manual liabilities sync ---
// Trigger a liabilities sync for all institutions (or a specific item_id).
// Usage: POST /sync-liabilities  or  POST /sync-liabilities { "item_id": "..." }
app.post("/sync-liabilities", async (req, res) => {
  const { item_id } = req.body || {};

  try {
    if (item_id) {
      // Sync a single item
      await syncLiabilities(item_id);
      return res.json({ success: true, synced: [item_id] });
    }

    // Sync all institutions
    const { data: institutions, error } = await supabase
      .from("institutions")
      .select("plaid_item_id")
      .eq("status", "active");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const results = [];
    for (const inst of institutions || []) {
      try {
        await syncLiabilities(inst.plaid_item_id);
        results.push({ item_id: inst.plaid_item_id, status: "ok" });
      } catch (err) {
        results.push({ item_id: inst.plaid_item_id, status: "error", message: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("[sync-liabilities] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Plaid webhook endpoint ---
// Plaid sends POST requests here when transaction data changes.
// We verify the signature, respond with 200 immediately (Plaid
// requires a response within 10 seconds), then process the sync
// in the background.
app.post("/webhook/plaid", async (req, res) => {
  const { webhook_type, webhook_code, item_id } = req.body;

  console.log(`[webhook] Received: ${webhook_type} / ${webhook_code} for item ${item_id}`);

  // Verify the webhook signature to confirm it came from Plaid
  try {
    await verifyPlaidWebhook(req);
  } catch (err) {
    console.error("[webhook] Verification failed:", err.message);
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  // Respond immediately — Plaid requires 200 within 10 seconds.
  // The actual sync runs in the background after this response.
  res.status(200).json({ received: true });

  // Only process SYNC_UPDATES_AVAILABLE; acknowledge all others silently
  if (webhook_type === "TRANSACTIONS" && webhook_code === "SYNC_UPDATES_AVAILABLE") {
    processSync(item_id).catch((err) => {
      console.error(`[webhook] Sync failed for item ${item_id}:`, err.message);
    });
  }
});

// --- OAuth callback ---
// Serves an HTML page that completes the Plaid Link OAuth flow.
// After the bank redirects here, this page fetches the link_token
// from the local setup server, reinitializes Plaid Link, and
// POSTs the resulting public_token back to localhost for processing.
app.get("/oauth-callback", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Finance Tracker — Completing Connection</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0a; color: #e0e0e0;
      display: flex; justify-content: center; align-items: center; min-height: 100vh;
    }
    .container { text-align: center; max-width: 480px; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #fff; }
    .subtitle { color: #888; margin-bottom: 32px; }
    #status {
      margin-top: 24px; padding: 16px; border-radius: 8px;
      text-align: left; font-size: 14px; line-height: 1.6;
    }
    .loading { background: #1a1a2e; border: 1px solid #3730a3; color: #818cf8; }
    .success { background: #052e16; border: 1px solid #166534; color: #4ade80; }
    .error { background: #2a0a0a; border: 1px solid #991b1b; color: #f87171; }
    .spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid #818cf8; border-top-color: transparent;
      border-radius: 50%; animation: spin 0.8s linear infinite;
      vertical-align: middle; margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Finance Tracker</h1>
    <p class="subtitle">Completing bank connection...</p>
    <div id="status" class="loading"><span class="spinner"></span>Resuming Plaid Link...</div>
  </div>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    const LOCAL = "http://localhost:8484";
    const status = document.getElementById("status");

    function show(type, html) {
      status.className = type;
      status.innerHTML = html;
    }

    async function run() {
      // Step 1: Get the link_token from the local server
      let linkToken;
      try {
        const res = await fetch(LOCAL + "/api/link-token-current");
        if (!res.ok) throw new Error("Local server not reachable or no link token");
        const data = await res.json();
        linkToken = data.link_token;
      } catch (err) {
        show("error", "Could not reach local server at " + LOCAL + "<br>" + err.message +
          "<br><br>Make sure the link-account server is running on your machine.");
        return;
      }

      // Step 2: Reinitialize Plaid Link with receivedRedirectUri
      const handler = Plaid.create({
        token: linkToken,
        receivedRedirectUri: window.location.href,
        onSuccess: async (publicToken, metadata) => {
          show("loading", '<span class="spinner"></span>Exchanging token and syncing transactions...');
          try {
            const res = await fetch(LOCAL + "/api/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public_token: publicToken, metadata }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(JSON.stringify(data.error));
            show("success",
              "<strong>Account linked successfully!</strong><br><br>" +
              "Institution: " + data.institution + "<br>" +
              "Accounts: " + data.accounts + "<br>" +
              "Transactions added: " + data.transactions.added + "<br><br>" +
              "<strong>Totals in database:</strong><br>" +
              "Institutions: " + data.totals.institutions + "<br>" +
              "Accounts: " + data.totals.accounts + "<br>" +
              "Transactions: " + data.totals.transactions + "<br><br>" +
              "<strong>ALL SYSTEMS GO!</strong> You can close this tab.");
          } catch (err) {
            show("error", "Exchange failed: " + err.message);
          }
        },
        onExit: (err) => {
          if (err) {
            show("error", "Plaid Link error: " + (err.error_message || err.display_message || JSON.stringify(err)));
          } else {
            show("error", "Plaid Link closed without completing. Please restart the process.");
          }
        },
      });

      handler.open();
    }

    run();
  </script>
</body>
</html>`);
});

// ============================================================
// 7. START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
  console.log(`Environment: ${PLAID_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
