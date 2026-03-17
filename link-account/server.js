// ============================================================
// Plaid Link — One-Time Account Setup
// Runs a local Express server that opens Plaid Link in the
// browser, exchanges the public_token for an access_token,
// stores institution + accounts + historical transactions
// in Supabase, then shuts down.
// ============================================================

import "dotenv/config";
import express from "express";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";

// ============================================================
// 1. ENVIRONMENT VALIDATION
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

const PORT = 8484;
const REDIRECT_URI = "https://claudefinancetracker.xyz/oauth-callback";
const WEBHOOK_URL = "https://claudefinancetracker.xyz/webhook/plaid";

// Store the current link token so the VPS OAuth callback page can retrieve it
let currentLinkToken = null;

// ============================================================
// 3. TRANSACTION MAPPING (same as webhook/index.js)
// ============================================================

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

// ============================================================
// 4. EXPRESS APP
// ============================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// CORS — allow the VPS OAuth callback page to call our local API
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === "https://claudefinancetracker.xyz") {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Serve static files
app.use(express.static(join(__dirname, "public")));

// Serve index.html for root
app.get("/", (_req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// ============================================================
// 5. CREATE LINK TOKEN
// ============================================================

app.get("/api/link-token", async (_req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "local-setup-user" },
      client_name: "AI Finance Tracker",
      products: ["transactions", "liabilities"],
      country_codes: ["US"],
      language: "en",
      webhook: WEBHOOK_URL,
      redirect_uri: REDIRECT_URI,
    });

    currentLinkToken = response.data.link_token;
    console.log("SUCCESS: Link token created");
    res.json({ link_token: currentLinkToken });
  } catch (err) {
    console.error("Link token error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Endpoint for VPS OAuth callback page to retrieve the current link token
app.get("/api/link-token-current", (_req, res) => {
  if (!currentLinkToken) {
    return res.status(404).json({ error: "No link token available" });
  }
  res.json({ link_token: currentLinkToken });
});

// ============================================================
// 6. SETUP LOGIC (shared by /api/exchange and /api/recover)
// ============================================================

const RECOVERY_FILE = join(__dirname, ".recovery.json");

async function runSetup(access_token, item_id, metadata, res) {
  // --- Step 2: Insert institution ---
  console.log("\n--- Step 2: Inserting institution ---");
  const institutionName =
    metadata?.institution?.name || "Unknown Institution";
  const plaidInstitutionId =
    metadata?.institution?.institution_id || null;

  const { data: institution, error: instError } = await supabase
    .from("institutions")
    .upsert(
      {
        plaid_item_id: item_id,
        institution_id: plaidInstitutionId,
        institution_name: institutionName,
        plaid_access_token: access_token,
      },
      { onConflict: "plaid_item_id" }
    )
    .select()
    .single();

  if (instError) throw new Error(`Institution insert failed: ${instError.message}`);
  console.log(`SUCCESS: Institution "${institutionName}" stored (id: ${institution.id})`);

  // --- Step 3: Fetch and insert accounts ---
  console.log("\n--- Step 3: Fetching accounts ---");
  const accountsResponse = await plaidClient.accountsGet({ access_token });
  const plaidAccounts = accountsResponse.data.accounts;

  const accountRows = plaidAccounts.map((a) => ({
    institution_id: institution.id,
    plaid_account_id: a.account_id,
    name: a.name,
    official_name: a.official_name || null,
    type: a.type,
    subtype: a.subtype || null,
    mask: a.mask || null,
    balance_available: a.balances.available,
    balance_current: a.balances.current,
    balance_limit: a.balances.limit,
    balance_updated_at: new Date().toISOString(),
  }));

  const { error: acctError } = await supabase
    .from("accounts")
    .upsert(accountRows, { onConflict: "plaid_account_id" });

  if (acctError) throw new Error(`Accounts insert failed: ${acctError.message}`);
  console.log(`SUCCESS: ${plaidAccounts.length} accounts stored`);

  // Build account map (plaid_account_id → UUID) for transactions
  const { data: storedAccounts } = await supabase
    .from("accounts")
    .select("id, plaid_account_id")
    .eq("institution_id", institution.id);

  const accountMap = new Map(
    (storedAccounts || []).map((a) => [a.plaid_account_id, a.id])
  );

  // --- Step 4: Sync historical transactions ---
  console.log("\n--- Step 4: Syncing historical transactions ---");
  let cursor = null;
  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  while (hasMore) {
    const syncRequest = { access_token };
    if (cursor) syncRequest.cursor = cursor;

    const syncResponse = await plaidClient.transactionsSync(syncRequest);
    const { added, modified, removed, next_cursor, has_more } =
      syncResponse.data;

    console.log(
      `  Page: +${added.length} added, ~${modified.length} modified, -${removed.length} removed`
    );

    if (added.length > 0) {
      const rows = added
        .map((t) => mapTransaction(t, accountMap))
        .filter((r) => r.account_id);

      if (rows.length > 0) {
        const { error } = await supabase
          .from("transactions")
          .upsert(rows, { onConflict: "plaid_transaction_id" });
        if (error) console.error("  Insert error:", error.message);
      }
      totalAdded += added.length;
    }

    if (modified.length > 0) {
      for (const t of modified) {
        const row = mapTransaction(t, accountMap);
        if (!row.account_id) continue;
        await supabase
          .from("transactions")
          .update(row)
          .eq("plaid_transaction_id", t.transaction_id);
      }
      totalModified += modified.length;
    }

    if (removed.length > 0) {
      const ids = removed.map((r) => r.transaction_id);
      await supabase
        .from("transactions")
        .delete()
        .in("plaid_transaction_id", ids);
      totalRemoved += removed.length;
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  console.log(
    `SUCCESS: Transactions synced — +${totalAdded} added, ~${totalModified} modified, -${totalRemoved} removed`
  );

  // --- Step 4b: Sync credit card liabilities ---
  console.log("\n--- Step 4b: Syncing credit card liabilities ---");
  try {
    const liabilitiesResponse = await plaidClient.liabilitiesGet({ access_token });
    const creditLiabilities = liabilitiesResponse.data.liabilities?.credit || [];

    if (creditLiabilities.length > 0) {
      for (const liability of creditLiabilities) {
        const accountId = accountMap.get(liability.account_id);
        if (!accountId) continue;

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
          console.error(`  Liability upsert error for account ${accountId}:`, upsertError.message);
          continue;
        }

        // Replace APRs
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
            console.error(`  APR insert error:`, aprError.message);
          }
        }
      }
      console.log(`SUCCESS: ${creditLiabilities.length} credit liabilities synced`);
    } else {
      console.log("No credit liabilities found for this item");
    }
  } catch (err) {
    if (err?.response?.data?.error_code === "PRODUCTS_NOT_SUPPORTED") {
      console.log("Liabilities not supported for this item — skipping");
    } else {
      console.error("Liabilities sync error (non-fatal):", err.message);
    }
  }

  // --- Step 5: Save sync cursor & write sync_log ---
  console.log("\n--- Step 5: Saving sync cursor ---");
  await supabase
    .from("institutions")
    .update({ sync_cursor: cursor })
    .eq("id", institution.id);

  await supabase.from("sync_log").insert({
    institution_id: institution.id,
    transactions_added: totalAdded,
    transactions_modified: totalModified,
    transactions_removed: totalRemoved,
    cursor_before: null,
    cursor_after: cursor,
  });
  console.log("SUCCESS: Sync cursor saved, sync_log written");

  // --- Step 6: Verify counts ---
  console.log("\n--- Step 6: Verification ---");
  const { count: instCount } = await supabase
    .from("institutions")
    .select("*", { count: "exact", head: true });
  const { count: acctCount } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true });
  const { count: txnCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true });

  console.log(`  Institutions: ${instCount}`);
  console.log(`  Accounts:     ${acctCount}`);
  console.log(`  Transactions: ${txnCount}`);

  console.log("\n============================================");
  console.log("  ALL SYSTEMS GO!");
  console.log("============================================\n");

  res.json({
    success: true,
    institution: institutionName,
    accounts: plaidAccounts.length,
    transactions: { added: totalAdded, modified: totalModified, removed: totalRemoved },
    totals: { institutions: instCount, accounts: acctCount, transactions: txnCount },
  });

  // Shut down after success
  console.log("Shutting down server...");
  setTimeout(() => process.exit(0), 1000);
}

// ============================================================
// 7. EXCHANGE ENDPOINT
// ============================================================

app.post("/api/exchange", async (req, res) => {
  const { public_token, metadata } = req.body;

  try {
    // --- Step 1: Exchange public_token → access_token ---
    console.log("\n--- Step 1: Exchanging public_token ---");
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    const { access_token, item_id } = exchangeResponse.data;
    console.log(`SUCCESS: Got access_token for item_id: ${item_id}`);

    // Save immediately so we can recover if downstream steps fail
    writeFileSync(RECOVERY_FILE, JSON.stringify({ access_token, item_id, metadata }, null, 2));
    console.log("SUCCESS: Recovery data saved to .recovery.json");

    await runSetup(access_token, item_id, metadata, res);
  } catch (err) {
    console.error("Exchange error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ============================================================
// 8. RECOVERY ENDPOINT (retry steps 2-6 from saved data)
// ============================================================

app.post("/api/recover", async (_req, res) => {
  try {
    const raw = readFileSync(RECOVERY_FILE, "utf-8");
    const { access_token, item_id, metadata } = JSON.parse(raw);
    console.log(`\n--- RECOVERY MODE for item_id: ${item_id} ---`);
    await runSetup(access_token, item_id, metadata, res);
  } catch (err) {
    console.error("Recovery error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ============================================================
// 9. ADD LIABILITIES TO EXISTING ITEMS
// Creates a link token in update mode to add the liabilities
// product to an already-linked item, then syncs liabilities.
// ============================================================

app.get("/api/add-liabilities-token", async (_req, res) => {
  try {
    // Find all institutions
    const { data: institutions, error } = await supabase
      .from("institutions")
      .select("id, plaid_item_id, plaid_access_token, institution_name");

    if (error || !institutions?.length) {
      return res.status(404).json({ error: "No institutions found" });
    }

    // Create update-mode link tokens for each institution
    const tokens = [];
    for (const inst of institutions) {
      try {
        const response = await plaidClient.linkTokenCreate({
          user: { client_user_id: "local-setup-user" },
          client_name: "AI Finance Tracker",
          access_token: inst.plaid_access_token,
          additional_consented_products: ["liabilities"],
          country_codes: ["US"],
          language: "en",
          redirect_uri: REDIRECT_URI,
        });

        currentLinkToken = response.data.link_token;
        tokens.push({
          institution: inst.institution_name,
          item_id: inst.plaid_item_id,
          link_token: response.data.link_token,
        });
        console.log(`Link token created for ${inst.institution_name}`);
      } catch (err) {
        console.error(`Failed for ${inst.institution_name}:`, err.response?.data || err.message);
        tokens.push({
          institution: inst.institution_name,
          error: err.response?.data?.error_message || err.message,
        });
      }
    }

    res.json({ tokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// After update-mode Link completes, sync liabilities for the item
app.post("/api/sync-liabilities", async (req, res) => {
  const { item_id } = req.body;

  try {
    console.log(`\n--- Syncing liabilities for ${item_id} ---`);

    const { data: institution } = await supabase
      .from("institutions")
      .select("id, plaid_access_token")
      .eq("plaid_item_id", item_id)
      .single();

    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }

    const accessToken = institution.plaid_access_token;
    const liabilitiesResponse = await plaidClient.liabilitiesGet({ access_token: accessToken });
    const creditLiabilities = liabilitiesResponse.data.liabilities?.credit || [];

    if (creditLiabilities.length === 0) {
      console.log("No credit liabilities found");
      return res.json({ success: true, synced: 0 });
    }

    // Build account map
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, plaid_account_id")
      .eq("institution_id", institution.id);

    const accountMap = new Map((accounts || []).map((a) => [a.plaid_account_id, a.id]));

    let synced = 0;
    for (const liability of creditLiabilities) {
      const accountId = accountMap.get(liability.account_id);
      if (!accountId) continue;

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
        console.error(`Upsert error for ${accountId}:`, upsertError.message);
        continue;
      }

      await supabase
        .from("credit_liability_aprs")
        .delete()
        .eq("credit_liability_id", upserted.id);

      if (liability.aprs?.length > 0) {
        await supabase.from("credit_liability_aprs").insert(
          liability.aprs.map((apr) => ({
            credit_liability_id: upserted.id,
            apr_percentage: apr.apr_percentage,
            apr_type: apr.apr_type,
            balance_subject_to_apr: apr.balance_subject_to_apr ?? null,
            interest_charge_amount: apr.interest_charge_amount ?? null,
          }))
        );
      }

      synced++;
    }

    console.log(`SUCCESS: ${synced} liabilities synced`);
    res.json({ success: true, synced });
  } catch (err) {
    console.error("Liabilities sync error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ============================================================
// 10. START SERVER & OPEN BROWSER
// ============================================================

const addLiabilitiesMode = process.argv.includes("--add-liabilities");

app.listen(PORT, () => {
  console.log(`\nLink server running at http://localhost:${PORT}`);
  console.log(`Environment: ${PLAID_ENV}`);
  if (addLiabilitiesMode) {
    console.log("Mode: Add liabilities to existing accounts");
    console.log("Opening browser...\n");
    exec(`open http://localhost:${PORT}/add-liabilities.html`);
  } else {
    console.log("Opening browser...\n");
    exec(`open http://localhost:${PORT}`);
  }
});
