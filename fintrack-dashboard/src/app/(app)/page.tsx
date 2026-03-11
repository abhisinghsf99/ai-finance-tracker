import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { NetPositionCard } from "@/components/dashboard/net-position-card"
import { AccountCards } from "@/components/dashboard/account-cards"
import { ChartsSection } from "@/components/dashboard/charts-section"
import { TransactionsPanel } from "@/components/dashboard/transactions-panel"
import { RecurringPanel } from "@/components/dashboard/recurring-panel"
import {
  getTrailingMonthlySpending,
  getCategorySpending,
  getTransactionsWithAccounts,
} from "@/lib/queries/transactions"
import { getAccounts } from "@/lib/queries/accounts"

export const dynamic = "force-dynamic"

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default async function DashboardPage() {
  const yearMonth = getCurrentYearMonth()

  const [monthlySpending, categorySpending, transactionsWithAccounts, accounts] =
    await Promise.all([
      getTrailingMonthlySpending(),
      getCategorySpending(yearMonth),
      getTransactionsWithAccounts({ limit: 500 }),
      getAccounts(),
    ])

  const accountsList = accounts.map((a) => ({
    id: a.id,
    name: a.name || a.official_name || "Account",
  }))

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <section id="summary" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[120px] rounded-lg" />
              <Skeleton className="h-[120px] rounded-lg" />
              <Skeleton className="h-[120px] rounded-lg" />
            </div>
          }
        >
          <SummaryCards />
        </Suspense>
        <div className="mt-4">
          <Suspense fallback={<Skeleton className="h-[140px] rounded-lg" />}>
            <NetPositionCard />
          </Suspense>
        </div>
      </section>

      {/* Accounts Section */}
      <section id="accounts" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Accounts</h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[100px] rounded-lg" />
              <Skeleton className="h-[100px] rounded-lg" />
            </div>
          }
        >
          <AccountCards />
        </Suspense>
      </section>

      {/* Charts Section */}
      <section id="charts" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Spending Overview</h2>
        <ChartsSection
          monthlySpending={monthlySpending}
          categorySpending={categorySpending}
          yearMonth={yearMonth}
          transactions={transactionsWithAccounts}
        />
      </section>

      {/* Transactions Section */}
      <section id="transactions" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Transactions</h2>
        <TransactionsPanel
          transactions={transactionsWithAccounts}
          accounts={accountsList}
        />
      </section>

      {/* Recurring Section */}
      <section id="recurring" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Recurring Charges</h2>
        <RecurringPanel transactions={transactionsWithAccounts} />
      </section>

      {/* Chat Placeholder */}
      <section id="chat" className="scroll-mt-16">
        <h2 className="text-xl font-semibold mb-4">Chat</h2>
        <p className="text-muted-foreground">Coming in Phase 4</p>
      </section>
    </div>
  )
}
