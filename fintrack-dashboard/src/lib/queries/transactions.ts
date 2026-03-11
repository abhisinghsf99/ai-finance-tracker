import { createServerSupabase } from "@/lib/supabase/server"
import type { Transaction } from "./types"

export async function getTransactions(
  options?: { limit?: number; offset?: number }
): Promise<Transaction[]> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error)
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  return data as Transaction[]
}

export async function getMonthlySpending(
  yearMonth: string
): Promise<{ total: number; count: number }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .like("date", `${yearMonth}%`)

  if (error)
    throw new Error(`Failed to fetch monthly spending: ${error.message}`)

  const spending = (data as { amount: number }[])
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    total: spending,
    count: (data as { amount: number }[]).filter((t) => t.amount > 0).length,
  }
}
