export interface ProductCategory {
  id: string
  name: string
  order: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  reference: string
  category: string | null
  category_name: string | null
  unit_price: string
  unit: "unit" | "hour" | "day" | "fixed"
  tax_rate: string
  is_active: boolean
  created_at: string
  updated_at: string
}
