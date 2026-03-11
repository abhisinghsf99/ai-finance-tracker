import { getMonthlySpending } from "@/lib/queries/transactions"
import { formatCurrency } from "@/lib/plaid-amounts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Receipt, TrendingDown, TrendingUp } from "lucide-react"

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getPreviousYearMonth(): string {
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`
}

function computePercentChange(
  current: number,
  previous: number
): { value: number; label: string; isDecrease: boolean } | null {
  if (previous === 0) return null
  const change = ((current - previous) / previous) * 100
  return {
    value: Math.abs(change),
    label: `${Math.abs(change).toFixed(1)}%`,
    isDecrease: change < 0,
  }
}

export async function SummaryCards() {
  const currentMonth = getCurrentYearMonth()
  const previousMonth = getPreviousYearMonth()

  const [current, previous] = await Promise.all([
    getMonthlySpending(currentMonth),
    getMonthlySpending(previousMonth),
  ])

  const pctChange = computePercentChange(current.total, previous.total)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Month Spending */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            This Month
          </CardTitle>
          <DollarSign className="h-4 w-4 text-teal-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-cyan-400">
            {current.total > 0 ? formatCurrency(current.total) : "$0.00"}
          </div>
          {current.total === 0 && (
            <p className="text-xs text-muted-foreground mt-1">No data</p>
          )}
        </CardContent>
      </Card>

      {/* Last Month Spending with % Change */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Month
          </CardTitle>
          {pctChange ? (
            pctChange.isDecrease ? (
              <TrendingDown className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-400" />
            )
          ) : (
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {previous.total > 0 ? formatCurrency(previous.total) : "$0.00"}
          </div>
          {pctChange ? (
            <p
              className={`text-xs mt-1 ${
                pctChange.isDecrease ? "text-green-400" : "text-red-400"
              }`}
            >
              {pctChange.isDecrease ? "Down" : "Up"} {pctChange.label} from last
              month
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {previous.total === 0 ? "New" : "N/A"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction Count */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transactions
          </CardTitle>
          <Receipt className="h-4 w-4 text-teal-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{current.count}</div>
          <p className="text-xs text-muted-foreground mt-1">
            This month
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default SummaryCards
