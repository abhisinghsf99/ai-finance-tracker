import { getAccounts } from "@/lib/queries/accounts"
import { formatCurrency } from "@/lib/plaid-amounts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Banknote, CreditCard, Landmark } from "lucide-react"
import type { Account } from "@/lib/queries/types"

const TYPE_ORDER = ["depository", "credit", "loan"] as const

const TYPE_CONFIG: Record<
  string,
  {
    label: string
    icon: typeof Landmark
    badgeClass: string
  }
> = {
  depository: {
    label: "Depository",
    icon: Landmark,
    badgeClass: "bg-teal-500/15 text-teal-400",
  },
  credit: {
    label: "Credit",
    icon: CreditCard,
    badgeClass: "bg-amber-500/15 text-amber-400",
  },
  loan: {
    label: "Loan",
    icon: Banknote,
    badgeClass: "bg-red-500/15 text-red-400",
  },
}

function getUtilizationColor(ratio: number): string {
  if (ratio < 0.3) return "bg-green-500"
  if (ratio <= 0.7) return "bg-amber-500"
  return "bg-red-500"
}

function formatSubtype(type: string, subtype: string | null): string {
  if (!subtype) return TYPE_CONFIG[type]?.label ?? type
  return subtype
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function CreditUtilizationBar({ account }: { account: Account }) {
  const balance = account.balance_current ?? 0
  const limit = account.balance_limit

  if (limit == null || limit === 0) {
    return (
      <p className="text-xs text-muted-foreground mt-2">No limit set</p>
    )
  }

  const ratio = Math.min(balance / limit, 1)
  const percentage = Math.round(ratio * 100)
  const colorClass = getUtilizationColor(ratio)

  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Utilization</span>
        <span className="text-muted-foreground">{percentage}% used</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatCurrency(balance)} of {formatCurrency(limit)}
      </p>
    </div>
  )
}

function AccountCard({ account }: { account: Account }) {
  const config = TYPE_CONFIG[account.type] ?? TYPE_CONFIG.depository
  const Icon = config.icon
  const displayName = account.name ?? account.official_name ?? "Unknown Account"
  const mask = account.mask ? `****${account.mask}` : ""

  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <CardTitle className="text-sm font-medium truncate">
            {displayName}
          </CardTitle>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${config.badgeClass}`}
        >
          {formatSubtype(account.type, account.subtype)}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-cyan-400">
            {formatCurrency(account.balance_current ?? 0)}
          </span>
          {mask && (
            <span className="text-xs text-muted-foreground">{mask}</span>
          )}
        </div>
        {account.type === "credit" && (
          <CreditUtilizationBar account={account} />
        )}
      </CardContent>
    </Card>
  )
}

export async function AccountCards() {
  const accounts = await getAccounts()

  if (accounts.length === 0) {
    return (
      <Card className="border-border/40">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No accounts linked</p>
        </CardContent>
      </Card>
    )
  }

  const grouped: { type: string; accounts: Account[] }[] = TYPE_ORDER.map(
    (type) => ({
      type,
      accounts: accounts.filter((a) => a.type === type),
    })
  ).filter((g) => g.accounts.length > 0)

  // Include any account types not in TYPE_ORDER
  const coveredTypes = new Set<string>(TYPE_ORDER)
  const otherAccounts = accounts.filter((a) => !coveredTypes.has(a.type))
  if (otherAccounts.length > 0) {
    grouped.push({ type: "other", accounts: otherAccounts })
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.type}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
            {TYPE_CONFIG[group.type]?.label ?? group.type}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {group.accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AccountCards
