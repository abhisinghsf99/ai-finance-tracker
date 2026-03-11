"use client"

import { useState } from "react"
import { PieChart, Pie, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getCategoryColor } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/plaid-amounts"
import { CategoryTransactions } from "./category-transactions"
import type { Transaction } from "@/lib/queries/types"

interface CategoryChartProps {
  data: { category: string; total: number; count: number }[]
  yearMonth: string
  transactions: Transaction[]
}

function prettifyCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function CategoryChart({
  data,
  yearMonth,
  transactions,
}: CategoryChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[250px] text-muted-foreground">
        No spending data for this month
      </div>
    )
  }

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d) => [
      d.category,
      { label: prettifyCategory(d.category), color: getCategoryColor(d.category) },
    ])
  )

  const selectedTotal = selectedCategory
    ? data.find((d) => d.category === selectedCategory)?.total ?? 0
    : 0

  const filteredTransactions = selectedCategory
    ? transactions.filter((t) => {
        const cat = t.category_primary ?? "OTHER"
        return cat === selectedCategory
      })
    : []

  return (
    <>
      <ChartContainer
        config={chartConfig}
        className="min-h-[250px] md:min-h-[300px] w-full"
      >
        <PieChart accessibilityLayer>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="category"
                formatter={(value, name) => {
                  const label = prettifyCategory(String(name))
                  return `${label}: ${formatCurrency(value as number)}`
                }}
                hideIndicator
              />
            }
          />
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            cursor="pointer"
            onClick={(_, index) => {
              setSelectedCategory(data[index].category)
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={getCategoryColor(entry.category)}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
        {data.map((entry) => (
          <button
            key={entry.category}
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSelectedCategory(entry.category)}
          >
            <span
              className="h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: getCategoryColor(entry.category) }}
            />
            {prettifyCategory(entry.category)}
          </button>
        ))}
      </div>

      {/* Drill-down Sheet */}
      <CategoryTransactions
        category={selectedCategory ?? ""}
        categoryLabel={selectedCategory ? prettifyCategory(selectedCategory) : ""}
        total={selectedTotal}
        transactions={filteredTransactions}
        open={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
      />
    </>
  )
}
