"use client"

import { useState, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { RecurringRow } from "@/components/dashboard/recurring-row"
import {
  detectRecurring,
  estimateMonthlyTotal,
} from "@/lib/recurring-detection"
import { formatCurrency } from "@/lib/plaid-amounts"
import type { Transaction } from "@/lib/queries/types"

interface RecurringPanelProps {
  transactions: Transaction[]
}

export function RecurringPanel({ transactions }: RecurringPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const recurring = useMemo(
    () => detectRecurring(transactions),
    [transactions]
  )
  const monthlyTotal = useMemo(
    () => estimateMonthlyTotal(recurring),
    [recurring]
  )

  if (recurring.length === 0) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground text-sm">
          No recurring charges detected
        </div>
      </Card>
    )
  }

  const previewCharges = recurring.slice(0, 3)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
            <h3 className="font-bold text-foreground">
              Recurring Charges ({recurring.length})
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
            {previewCharges.map((charge) => (
              <RecurringRow key={charge.merchantName} charge={charge} />
            ))}
            <div className="px-0 py-3 border-t border-border text-sm text-muted-foreground">
              ~{formatCurrency(monthlyTotal)}/mo estimated
            </div>
          </div>
        )}

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="px-4">
            {recurring.map((charge) => (
              <RecurringRow key={charge.merchantName} charge={charge} />
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
            ~{formatCurrency(monthlyTotal)}/mo estimated
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
