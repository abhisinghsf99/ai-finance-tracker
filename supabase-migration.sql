-- ============================================================
-- Financial Assistant — Supabase Migration
-- Run this in Supabase SQL Editor after creating your project
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Tracks each connected bank (one per Plaid Item)
CREATE TABLE institutions (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    plaid_item_id   text UNIQUE NOT NULL,
    plaid_access_token text NOT NULL,          -- encrypt at app level before storing
    institution_name text NOT NULL,            -- "Chase", "Amex", etc.
    institution_id  text NOT NULL,             -- Plaid's institution ID
    sync_cursor     text,                      -- latest /transactions/sync cursor
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'error', 'login_required')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Individual accounts within each institution
CREATE TABLE accounts (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    plaid_account_id  text UNIQUE NOT NULL,
    institution_id    uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name              text,                    -- "Sapphire Reserve", "Platinum Checking"
    official_name     text,                    -- bank's official name
    type              text NOT NULL,           -- "credit", "depository", "loan"
    subtype           text,                    -- "credit card", "checking", "savings"
    mask              text,                    -- last 4 digits
    balance_available numeric,
    balance_current   numeric,
    balance_limit     numeric,                 -- credit limit (null for non-credit)
    balance_updated_at timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- Main transactions table — most queries hit this
CREATE TABLE transactions (
    id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    plaid_transaction_id    text UNIQUE NOT NULL,
    account_id              uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount                  numeric NOT NULL,
    date                    date NOT NULL,              -- posted date
    datetime                timestamptz,                -- precise timestamp when available
    name                    text,                       -- raw bank description
    merchant_name           text,                       -- cleaned merchant name
    merchant_entity_id      text,                       -- stable Plaid merchant ID
    category_primary        text,                       -- "FOOD_AND_DRINK", "ENTERTAINMENT"
    category_detailed       text,                       -- "FOOD_AND_DRINK_RESTAURANTS"
    payment_channel         text,                       -- "online", "in store", "other"
    is_pending              boolean NOT NULL DEFAULT false,
    pending_transaction_id  text,                       -- links to the pending version
    iso_currency_code       text DEFAULT 'USD',
    logo_url                text,                       -- merchant logo
    website                 text,                       -- merchant website
    raw_data                jsonb,                      -- full Plaid response
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Tracks every sync event for debugging
CREATE TABLE sync_log (
    id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id          uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    transactions_added      int NOT NULL DEFAULT 0,
    transactions_modified   int NOT NULL DEFAULT 0,
    transactions_removed    int NOT NULL DEFAULT 0,
    cursor_before           text,
    cursor_after            text,
    synced_at               timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Transaction queries: month-over-month analytics, daily queries
CREATE INDEX idx_transactions_date ON transactions(date);

-- Merchant-specific lookups ("all Amazon transactions")
CREATE INDEX idx_transactions_merchant ON transactions(merchant_name);

-- Category spending queries ("how much on dining?")
CREATE INDEX idx_transactions_category ON transactions(category_primary);

-- Per-account spending by date
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date);

-- Threshold-based queries ("transactions over $50")
CREATE INDEX idx_transactions_amount ON transactions(amount);

-- Pending status filter
CREATE INDEX idx_transactions_pending ON transactions(is_pending) WHERE is_pending = true;

-- Sync log: lookup by institution
CREATE INDEX idx_sync_log_institution ON sync_log(institution_id);

-- ============================================================
-- 3. AUTO-UPDATE TIMESTAMPS
-- ============================================================

-- Function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_institutions_updated_at
    BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. ROW-LEVEL SECURITY (RLS)
-- ============================================================
-- Since this is a single-user personal project, RLS is configured
-- to allow the service_role key (used by your webhook server and
-- MCP server) full read/write access, while blocking anonymous access.
--
-- If you later add multi-user support, add a user_id column to each
-- table and update policies to filter by auth.uid().

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Service role bypass: service_role key has full access
-- (Supabase grants service_role bypass by default, but these
-- policies ensure the anon key cannot read financial data)

-- Institutions: only service role
CREATE POLICY "Service role full access on institutions"
    ON institutions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Accounts: only service role
CREATE POLICY "Service role full access on accounts"
    ON accounts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Transactions: only service role
CREATE POLICY "Service role full access on transactions"
    ON transactions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Sync log: only service role
CREATE POLICY "Service role full access on sync_log"
    ON sync_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. CREDIT CARD LIABILITIES
-- ============================================================

-- Stores data from Plaid's /liabilities/get endpoint
CREATE TABLE credit_liabilities (
    id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id              uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    is_overdue              boolean,
    last_payment_amount     numeric,
    last_payment_date       date,
    last_statement_issue_date date,
    last_statement_balance  numeric,
    minimum_payment_amount  numeric,
    next_payment_due_date   date,
    updated_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE(account_id)
);

CREATE TABLE credit_liability_aprs (
    id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_liability_id     uuid NOT NULL REFERENCES credit_liabilities(id) ON DELETE CASCADE,
    apr_percentage           numeric NOT NULL,
    apr_type                text NOT NULL CHECK (apr_type IN ('balance_transfer_apr', 'cash_apr', 'purchase_apr', 'special')),
    balance_subject_to_apr  numeric,
    interest_charge_amount  numeric
);

CREATE INDEX idx_credit_liabilities_account ON credit_liabilities(account_id);
CREATE INDEX idx_credit_liability_aprs_liability ON credit_liability_aprs(credit_liability_id);

ALTER TABLE credit_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_liability_aprs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on credit_liabilities"
    ON credit_liabilities FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on credit_liability_aprs"
    ON credit_liability_aprs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_credit_liabilities_updated_at
    BEFORE UPDATE ON credit_liabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
