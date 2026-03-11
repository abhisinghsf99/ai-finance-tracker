"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TransactionRow } from "@/components/dashboard/transaction-row"
import { TransactionsToolbar } from "@/components/dashboard/transactions-toolbar"
import { TransactionFilterPopover } from "@/components/dashboard/transaction-filters"
import { FilterChips } from "@/components/dashboard/filter-chips"
import {
  applyBaseFilter,
  searchTransactions,
  filterTransactions,
  sortTransactions,
} from "@/lib/transaction-filters"
import type { SortOption, TransactionFilters } from "@/lib/transaction-filters"
import type { TransactionWithAccount } from "@/lib/queries/transactions"
import { formatCurrency } from "@/lib/plaid-amounts"

interface TransactionsPanelProps {
  transactions: TransactionWithAccount[]
  accounts: { id: string; name: string }[]
  onLoadMore?: () => void
  hasMore?: boolean
}

function getActiveFilterCount(filters: TransactionFilters): number {
  let count = 0
  if (filters.dateRange) count++
  if (filters.category !== undefined) count++
  if (filters.amountMin !== undefined || filters.amountMax !== undefined) count++
  if (filters.accountId !== undefined) count++
  return count
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function sumSpendingInDays(
  transactions: TransactionWithAccount[],
  days: number
): number {
  const cutoff = daysAgo(days)
  return transactions
    .filter((t) => t.date >= cutoff)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

function getUniqueCategories(
  transactions: TransactionWithAccount[]
): string[] {
  const cats = new Set<string>()
  transactions.forEach((t) => {
    if (t.category_primary) cats.add(t.category_primary)
  })
  return Array.from(cats).sort()
}

export function TransactionsPanel({
  transactions,
  accounts,
  onLoadMore,
  hasMore = false,
}: TransactionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [sortOption, setSortOption] = useState<SortOption>("date-desc")
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Full filtering pipeline
  const filteredTransactions = useMemo(() => {
    let result = applyBaseFilter(transactions)
    result = searchTransactions(result, searchTerm)
    result = filterTransactions(result, filters)
    result = sortTransactions(result, sortOption)
    return result
  }, [transactions, searchTerm, filters, sortOption])

  // Total count before search/filter (but after base filter)
  const totalCount = useMemo(
    () => applyBaseFilter(transactions).length,
    [transactions]
  )

  const activeFilterCount = getActiveFilterCount(filters)
  const hasActiveFilters = activeFilterCount > 0 || searchTerm.length > 0
  const categories = useMemo(
    () => getUniqueCategories(transactions),
    [transactions]
  )

  // Collapsed: show 3 most recent
  const collapsedTransactions = filteredTransactions.slice(0, 3)
  const spending3Days = sumSpendingInDays(filteredTransactions, 3)

  // Expanded: show last 14 days
  const fourteenDaysAgo = daysAgo(14)
  const expandedTransactions = filteredTransactions.filter(
    (t) => t.date >= fourteenDaysAgo
  )
  const spending14Days = sumSpendingInDays(filteredTransactions, 14)

  const handleRemoveFilter = (key: keyof TransactionFilters) => {
    const next = { ...filters }
    delete next[key]
    setFilters(next)
  }

  // Loading skeleton
  if (transactions.length === 0) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-5" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1 py-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
            <h3 className="font-bold text-foreground">
              {hasActiveFilters
                ? `Showing ${filteredTransactions.length} of ${totalCount} transactions`
                : `Transactions (${filteredTransactions.length})`}
            </h3>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>

        {/* Collapsed preview */}
        {!isOpen && (
          <div className="px-4 pb-2">
            {collapsedTransactions.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
            <div className="px-0 py-3 border-t border-border text-sm text-muted-foreground">
              {formatCurrency(spending3Days)} in the last 3 days
            </div>
          </div>
        )}

        {/* Expanded content */}
        <CollapsibleContent>
          {/* Toolbar */}
          <TransactionsToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onFilterClick={() => setFilterPopoverOpen(!filterPopoverOpen)}
            activeFilterCount={activeFilterCount}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          {/* Filter popover (triggered externally) */}
          <TransactionFilterPopover
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            accounts={accounts}
            open={filterPopoverOpen}
            onOpenChange={setFilterPopoverOpen}
          />

          {/* Filter chips */}
          {activeFilterCount > 0 && (
            <FilterChips
              filters={filters}
              onRemove={handleRemoveFilter}
              categories={categories}
              accounts={accounts}
            />
          )}

          {/* Transaction list */}
          <div className="px-4 max-h-[500px] overflow-y-auto">
            {expandedTransactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No transactions found
              </div>
            ) : (
              expandedTransactions.map((txn) => (
                <TransactionRow key={txn.id} transaction={txn} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
            {formatCurrency(spending14Days)} in the last 14 days
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="px-4 pb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={onLoadMore}
              >
                Load more
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
