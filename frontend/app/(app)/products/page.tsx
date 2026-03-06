"use client"

import { useEffect, useState, useCallback } from "react"
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchProductCategories,
  createProductCategory,
  deleteProductCategory,
} from "@/services/products"
import type { Product, ProductCategory } from "@/types/products"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Loader2,
  Trash2,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { Pagination } from "@/components/shared/Pagination"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"

const PAGE_SIZE = 20

const UNIT_LABELS: Record<Product["unit"], string> = {
  unit: "Unite",
  hour: "Heure",
  day: "Jour",
  fixed: "Forfait",
}

function formatEUR(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(num)
}

const emptyForm = {
  name: "",
  description: "",
  reference: "",
  category: "" as string,
  unit_price: "",
  unit: "unit" as Product["unit"],
  tax_rate: "20",
  is_active: true,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showActive, setShowActive] = useState<"active" | "archived" | "all">("active")
  const [filterOpen, setFilterOpen] = useState(false)
  const activeFilterCount = [search, selectedCategory, showActive !== "active" ? showActive : null].filter(Boolean).length

  // Product dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Category management dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchProductCategories()
      setCategories(data)
    } catch (err) {
      console.error("Failed to fetch product categories:", err)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page) }
      if (search.trim()) params.search = search.trim()
      if (selectedCategory) params.category = selectedCategory
      if (showActive === "active") params.is_active = "true"
      else if (showActive === "archived") params.is_active = "false"
      const data = await fetchProducts(params)
      setProducts(data.results)
      setTotalCount(data.count)
    } catch (err) {
      console.error("Failed to fetch products:", err)
    } finally {
      setLoading(false)
    }
  }, [search, page, selectedCategory, showActive])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadProducts, search])

  useEffect(() => {
    setPage(1)
  }, [search, selectedCategory, showActive])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const openCreateDialog = () => {
    setEditingProduct(null)
    setFormData(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      reference: product.reference || "",
      category: product.category || "",
      unit_price: product.unit_price || "",
      unit: product.unit,
      tax_rate: product.tax_rate || "20",
      is_active: product.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        reference: formData.reference,
        category: formData.category || null,
        unit_price: formData.unit_price,
        unit: formData.unit,
        tax_rate: formData.tax_rate,
        is_active: formData.is_active,
      }
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload)
      }
      setDialogOpen(false)
      loadProducts()
    } catch (err) {
      console.error("Failed to save product:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingProduct) return
    setDeleting(true)
    try {
      await deleteProduct(editingProduct.id)
      setDeleteDialogOpen(false)
      setDialogOpen(false)
      loadProducts()
    } catch (err) {
      console.error("Failed to delete product:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      await createProductCategory({ name: newCategoryName.trim() })
      setNewCategoryName("")
      loadCategories()
    } catch (err) {
      console.error("Failed to create category:", err)
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    setDeletingCategoryId(id)
    try {
      await deleteProductCategory(id)
      loadCategories()
    } catch (err) {
      console.error("Failed to delete category:", err)
    } finally {
      setDeletingCategoryId(null)
    }
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: "reference",
      header: "Reference",
      className: "text-muted-foreground text-sm font-[family-name:var(--font-body)]",
      render: (p) => p.reference || "-",
    },
    {
      key: "name",
      header: "Nom",
      className: "font-medium text-sm",
      render: (p) => p.name,
    },
    {
      key: "category",
      header: "Categorie",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]",
      render: (p) => p.category_name || "-",
    },
    {
      key: "price",
      header: "Prix unitaire",
      headerClassName: "text-right",
      className: "text-right tabular-nums text-sm",
      render: (p) => p.unit_price ? formatEUR(p.unit_price) : "-",
    },
    {
      key: "unit",
      header: "Unite",
      headerClassName: "hidden lg:table-cell",
      className: "hidden lg:table-cell text-muted-foreground text-sm font-[family-name:var(--font-body)]",
      render: (p) => UNIT_LABELS[p.unit],
    },
    {
      key: "tax",
      header: "TVA",
      headerClassName: "hidden lg:table-cell text-right",
      className: "hidden lg:table-cell text-right text-muted-foreground tabular-nums text-sm",
      render: (p) => p.tax_rate ? `${p.tax_rate}%` : "-",
    },
    {
      key: "status",
      header: "Statut",
      render: (p) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          p.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
        }`}>
          {p.is_active ? "Actif" : "Archive"}
        </span>
      ),
    },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        title="Produits"
        subtitle={`${totalCount} produit${totalCount !== 1 ? "s" : ""} au total`}
      >
        <FilterTriggerButton open={filterOpen} onOpenChange={setFilterOpen} activeFilterCount={activeFilterCount} />
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Button>
      </PageHeader>

      {/* Content with filter panel */}
      <div className="flex gap-0">
        <div className="flex-1 min-w-0 space-y-8">
          <DataTable
            columns={columns}
            data={products}
            loading={loading}
            emptyMessage="Aucun produit trouve."
            onRowClick={openEditDialog}
            rowKey={(p) => p.id}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
        <FilterPanel
          open={filterOpen}
          onOpenChange={setFilterOpen}
          onReset={() => { setSearch(""); setSelectedCategory(""); setShowActive("active") }}
          activeFilterCount={activeFilterCount}
        >
          <FilterSection label="Recherche">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-secondary/30 border-border/60" />
            </div>
          </FilterSection>
          <FilterSection label="Categorie">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-1.5 text-sm">
              <option value="">Toutes</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <button onClick={() => setCategoryDialogOpen(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1 font-[family-name:var(--font-body)]">
              Gerer les categories
            </button>
          </FilterSection>
          <FilterSection label="Statut">
            <div className="flex flex-col gap-1">
              {(["active", "archived", "all"] as const).map((status) => (
                <button key={status} onClick={() => setShowActive(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-left font-[family-name:var(--font-body)] ${
                    showActive === status ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {status === "active" ? "Actifs" : status === "archived" ? "Archives" : "Tous"}
                </button>
              ))}
            </div>
          </FilterSection>
        </FilterPanel>
      </div>

      {/* Create/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="product-name"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
              >
                Nom *
              </Label>
              <Input
                id="product-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="h-11 bg-secondary/30 border-border/60"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="product-description"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
              >
                Description
              </Label>
              <Textarea
                id="product-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="bg-secondary/30 border-border/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="product-reference"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
                >
                  Reference
                </Label>
                <Input
                  id="product-reference"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="product-category"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
                >
                  Categorie
                </Label>
                <select
                  id="product-category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">-- Aucune --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="product-price"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
                >
                  Prix unitaire
                </Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_price: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="product-unit"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
                >
                  Unite
                </Label>
                <select
                  id="product-unit"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit: e.target.value as Product["unit"],
                    })
                  }
                  className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="unit">Unite</option>
                  <option value="hour">Heure</option>
                  <option value="day">Jour</option>
                  <option value="fixed">Forfait</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="product-tax"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]"
                >
                  TVA (%)
                </Label>
                <Input
                  id="product-tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-[family-name:var(--font-body)]">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">Produit actif</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {editingProduct && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:text-destructive gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingProduct ? "Enregistrer" : "Creer"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Etes-vous sur de vouloir supprimer{" "}
            <strong>{editingProduct?.name}</strong> ? Cette action est
            irreversible.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category management dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerer les categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nouvelle categorie..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-10 bg-secondary/30 border-border/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreateCategory()
                  }
                }}
              />
              <Button
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
                size="sm"
                className="h-10 shrink-0"
              >
                {creatingCategory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 font-[family-name:var(--font-body)]">
                Aucune categorie.
              </p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/30 font-[family-name:var(--font-body)]"
                  >
                    <span className="text-sm">{cat.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={deletingCategoryId === cat.id}
                    >
                      {deletingCategoryId === cat.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
