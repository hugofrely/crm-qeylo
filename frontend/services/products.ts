import { apiFetch } from "@/lib/api"
import type { Product, ProductCategory } from "@/types/products"

export async function fetchProducts(params?: Record<string, string>): Promise<{ results: Product[]; count: number }> {
  const query = params ? "?" + new URLSearchParams(params).toString() : ""
  return apiFetch<{ results: Product[]; count: number }>(`/products/${query}`)
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return apiFetch<Product>("/products/", { method: "POST", json: data })
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/`, { method: "PATCH", json: data })
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/products/${id}/`, { method: "DELETE" })
}

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  return apiFetch<ProductCategory[]>("/products/categories/")
}

export async function createProductCategory(data: { name: string; order?: number }): Promise<ProductCategory> {
  return apiFetch<ProductCategory>("/products/categories/", { method: "POST", json: data })
}

export async function updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
  return apiFetch<ProductCategory>(`/products/categories/${id}/`, { method: "PATCH", json: data })
}

export async function deleteProductCategory(id: string): Promise<void> {
  await apiFetch(`/products/categories/${id}/`, { method: "DELETE" })
}
