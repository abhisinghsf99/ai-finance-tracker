export interface Institution {
  id: string
  plaid_item_id: string
  institution_name: string
  institution_id: string
  status: "active" | "error" | "login_required"
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  plaid_account_id: string
  institution_id: string
  name: string | null
  official_name: string | null
  type: string
  subtype: string | null
  mask: string | null
  balance_available: number | null
  balance_current: number | null
  balance_limit: number | null
  balance_updated_at: string | null
  created_at: string
}

export interface Transaction {
  id: string
  plaid_transaction_id: string
  account_id: string
  amount: number
  date: string
  datetime: string | null
  name: string | null
  merchant_name: string | null
  merchant_entity_id: string | null
  category_primary: string | null
  category_detailed: string | null
  payment_channel: string | null
  is_pending: boolean
  pending_transaction_id: string | null
  iso_currency_code: string
  logo_url: string | null
  website: string | null
  created_at: string
  updated_at: string
}
