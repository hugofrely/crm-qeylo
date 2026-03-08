"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchCustomFieldDefinitions, createCustomFieldDefinition, updateCustomFieldDefinition, deleteCustomFieldDefinition } from "@/services/contacts"
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
import type { CustomFieldDefinition } from "@/types"
import { useTranslations } from "next-intl"

export default function CustomFieldsManager() {
  const t = useTranslations("settings.customFields")
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldType, setFieldType] = useState("text")
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldOptions, setFieldOptions] = useState("")
  const [saving, setSaving] = useState(false)

  const FIELD_TYPE_LABELS: Record<string, string> = {
    text: t("types.text"),
    long_text: t("types.long_text"),
    number: t("types.number"),
    date: t("types.date"),
    select: t("types.select"),
    email: t("types.email"),
    phone: t("types.phone"),
    url: t("types.url"),
    checkbox: t("types.checkbox"),
  }

  const fetchFields = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchCustomFieldDefinitions()
      setCustomFields(res)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const openDialog = (field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field)
      setFieldLabel(field.label)
      setFieldType(field.field_type)
      setFieldRequired(field.is_required)
      setFieldOptions(field.options?.join("\n") ?? "")
    } else {
      setEditingField(null)
      setFieldLabel("")
      setFieldType("text")
      setFieldRequired(false)
      setFieldOptions("")
    }
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        label: fieldLabel,
        field_type: fieldType,
        is_required: fieldRequired,
      }
      if (fieldType === "select") {
        payload.options = fieldOptions
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      }
      if (editingField) {
        await updateCustomFieldDefinition(editingField.id, payload)
      } else {
        await createCustomFieldDefinition(payload)
      }
      setDialogOpen(false)
      fetchFields()
    } catch (err) {
      console.error("Failed to save custom field:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (field: CustomFieldDefinition) => {
    if (!confirm(t("deleteConfirm", { label: field.label }))) return
    try {
      await deleteCustomFieldDefinition(field.id)
      fetchFields()
    } catch (err) {
      console.error("Failed to delete custom field:", err)
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
          {customFields.map((field) => (
            <div
              key={field.id}
              className="flex items-center gap-3 rounded-xl border border-border p-3.5 hover:bg-secondary/20 transition-colors"
            >
              <span className="text-sm font-medium flex-1 min-w-0">
                {field.label}
              </span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
              </Badge>
              {field.is_required && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {t("required")}
                </Badge>
              )}
              <button
                onClick={() => openDialog(field)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(field)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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
        {t("addField")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? t("editTitle") : t("newTitle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 font-[family-name:var(--font-body)]">
            <div className="space-y-2">
              <Label htmlFor="field-label" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("label")}
              </Label>
              <Input
                id="field-label"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder={t("labelPlaceholder")}
                required
                className="h-11 bg-secondary/30 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-type" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("type")}
              </Label>
              <select
                id="field-type"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm"
              >
                {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {fieldType === "select" && (
              <div className="space-y-2">
                <Label htmlFor="field-options" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("options")}
                </Label>
                <textarea
                  id="field-options"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  placeholder={t("optionsPlaceholder")}
                  rows={4}
                  className="w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm resize-none"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                id="field-required"
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                className="h-4 w-4 rounded border-border/60"
              />
              <Label htmlFor="field-required" className="text-sm font-[family-name:var(--font-body)] cursor-pointer">
                {t("requiredField")}
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingField ? t("save") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
