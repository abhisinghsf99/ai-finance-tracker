# Testing Patterns

**Analysis Date:** 2026-03-10

## Test Framework

**Runner:**
- Not detected — no test framework configured
- No `jest.config.js`, `vitest.config.js`, or similar found
- No test dependencies in `package.json` files

**Assertion Library:**
- Not applicable — no tests present in codebase

**Run Commands:**
```bash
# Not applicable — no test infrastructure exists
# No test command in package.json scripts
```

## Test File Organization

**Location:**
- No test files found in the codebase
- No separate `tests/` directory
- No co-located `.test.js` or `.spec.js` files

**Naming:**
- Not established — no test files to pattern match against

**Structure:**
- Not applicable

## Test Structure

**Suite Organization:**
- Not applicable — no tests written

**Patterns:**
- No setup/teardown patterns observed
- No assertion patterns established
- No test data fixtures

## Mocking

**Framework:**
- Not implemented — no test infrastructure

**Patterns:**
- Not applicable

**What to Mock:**
- No guidelines established

**What NOT to Mock:**
- No guidelines established

## Fixtures and Factories

**Test Data:**
- Not implemented

**Location:**
- Not applicable

## Coverage

**Requirements:**
- No coverage targets enforced
- Coverage not measured

**View Coverage:**
```bash
# Not applicable
```

## Test Types

**Unit Tests:**
- Not implemented
- No unit test patterns established

**Integration Tests:**
- Not implemented
- No integration test patterns established

**E2E Tests:**
- Not implemented — no E2E testing framework used

## Current Testing Approach

### Runtime Validation Only

The project uses **runtime validation via Zod** instead of test suites. This is the only form of "testing" currently in place.

**Example from `mcp-server/tools.js` (lines 172-180):**
```javascript
server.registerTool(
  "execute_query",
  {
    description: "...",
    inputSchema: {
      sql: z.string().describe("The SQL SELECT query to execute"),
      natural_language_query: z
        .string()
        .optional()
        .describe("..."),
    },
  },
  // Handler function validates at runtime
);
```

**Example from `webhook/index.js` (lines 1-44):**
```javascript
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PLAID_CLIENT_ID,
  PLAID_SECRET,
  PLAID_ENV,
} = process.env;

const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}
```

### Error Handling as Validation

Error checking happens at runtime with explicit validation functions.

**Example from `mcp-server/tools.js` (lines 32-56) — SQL validation:**
```javascript
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
```

**Example from `webhook/index.js` (lines 84-126) — Plaid webhook signature verification:**
```javascript
async function verifyPlaidWebhook(req) {
  const token = req.headers["plaid-verification"];
  if (!token) {
    throw new Error("Missing Plaid-Verification header");
  }

  const jwtHeader = decodeProtectedHeader(token);
  const kid = jwtHeader.kid;

  if (!kid) {
    throw new Error("JWT header missing kid");
  }

  // Fetch/cache signing key, verify JWT, verify body hash
  // Throws on any validation failure
}
```

## Recommendations for Adding Tests

### For Backend Services (Node.js)

**When to add tests:**
1. Critical paths: Plaid sync logic, database mutations, webhook handling
2. Data transformation: Transaction mapping, schema formatting
3. Security: Signature verification, query validation

**Recommended setup:**
```bash
npm install --save-dev vitest @vitest/ui
```

**Test structure for `webhook/index.js`:**
```javascript
// webhook/index.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyPlaidWebhook } from './index.js';
import { decodeProtectedHeader, jwtVerify } from 'jose';

describe('Plaid Webhook Verification', () => {
  it('rejects requests without Plaid-Verification header', async () => {
    const req = { headers: {} };
    await expect(verifyPlaidWebhook(req)).rejects.toThrow('Missing Plaid-Verification header');
  });

  it('verifies valid webhook signatures', async () => {
    // Mock jose, test happy path
  });
});
```

**Test structure for `mcp-server/tools.js`:**
```javascript
// mcp-server/tools.test.js
import { describe, it, expect } from 'vitest';

describe('SQL Query Validation', () => {
  it('rejects non-SELECT queries', () => {
    const result = validateQuery('INSERT INTO users VALUES (1)');
    expect(result).toContain('Query must be a SELECT statement');
  });

  it('rejects queries with forbidden keywords', () => {
    const result = validateQuery('SELECT * FROM users; DROP TABLE users;');
    expect(result).toContain('Forbidden keyword');
  });

  it('accepts safe SELECT queries', () => {
    const result = validateQuery('SELECT * FROM transactions WHERE id = 1');
    expect(result).toBeNull();
  });
});
```

### For Next.js Frontend

**When tests are written, follow these patterns:**

**Example: Testing a Server Component**
```typescript
// app/(dashboard)/page.test.tsx
import { createServerClient } from '@/lib/supabase/server';
import { TransactionsPage } from './page';
import { vi } from 'vitest';

vi.mock('@/lib/supabase/server');

test('loads transactions on page render', async () => {
  // Mock supabase client
  // Assert component calls correct queries
});
```

**Example: Testing a Client Component**
```typescript
// components/features/transactions/transaction-filters.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionFilters } from './transaction-filters';

test('calls onFilterChange when category is selected', () => {
  const handleFilterChange = vi.fn();
  render(<TransactionFilters onFilterChange={handleFilterChange} />);

  fireEvent.click(screen.getByText('Groceries'));
  expect(handleFilterChange).toHaveBeenCalledWith(expect.objectContaining({
    categories: ['Groceries']
  }));
});
```

**Example: Testing a Zustand Store**
```typescript
// stores/filter-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFilterStore } from './filter-store';

test('toggles category in filter state', () => {
  const { result } = renderHook(() => useFilterStore());

  act(() => {
    result.current.toggleCategory('Groceries');
  });

  expect(result.current.categories).toContain('Groceries');

  act(() => {
    result.current.toggleCategory('Groceries');
  });

  expect(result.current.categories).not.toContain('Groceries');
});
```

### Configuration Template (if adding tests)

**vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js', '**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**', 'mcp-server/**', 'webhook/**', 'link-account/**'],
    },
  },
});
```

**package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

*Testing analysis: 2026-03-10*
