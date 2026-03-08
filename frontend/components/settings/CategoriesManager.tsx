"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchContactCategories, createContactCategory, updateContactCategory, deleteContactCategory } from "@/services/contacts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Loader2, Plus, Pencil } from "lucide-react"
import type { ContactCategory } from "@/types"
import { useTranslations } from "next-intl"

export default function CategoriesManager() {
  const t = useTranslations("settings.categories")
  const [categories, setCategories] = useState<ContactCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ContactCategory | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [categoryColor, setCategoryColor] = useState("#3b82f6")
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchContactCategories()
      setCategories(res)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const openDialog = (category?: ContactCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryName(category.name)
      setCategoryColor(category.color)
    } else {
      setEditingCategory(null)
      setCategoryName("")
      setCategoryColor("#3b82f6")
    }
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingCategory) {
        await updateContactCategory(editingCategory.id, { name: categoryName, color: categoryColor })
      } else {
        await createContactCategory({ name: categoryName, color: categoryColor })
      }
      setDialogOpen(false)
      fetchCategories()
    } catch (err) {
      console.error("Failed to save category:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (category: ContactCategory) => {
    if (category.is_default) return
    if (!confirm(t("deleteConfirm", { name: category.name }))) return
    try {
      await deleteContactCategory(category.id)
      fetchCategories()
    } catch (err) {
      console.error("Failed to delete category:", err)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
          {t("subtitle")}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2 font-[family-name:var(--font-body)]">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3.5 hover:bg-secondary/20 transition-colors"
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm font-medium flex-1 min-w-0">
                {category.name}
              </span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {category.contact_count}
              </Badge>
              {category.is_default && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {t("default")}
                </Badge>
              )}
              <button
                onClick={() => openDialog(category)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {!category.is_default && (
                <button
                  onClick={() => handleDelete(category)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => openDialog()}
      >
        <Plus className="h-4 w-4" />
        {t("addCategory")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t("editTitle") : t("newTitle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="space-y-2">
              <Label htmlFor="category-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("name")}
              </Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
                className="h-11 bg-secondary/30 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-color" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("color")}
              </Label>
              <div className="flex items-center gap-3">
                <input
                  id="category-color"
                  type="color"
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-border/60 bg-secondary/30 p-1"
                />
                <Input
                  value={categoryColor}
                  onChange={(e) => setCategoryColor(e.target.value)}
                  className="h-11 bg-secondary/30 border-border/60 flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCategory ? t("save") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
