"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchOrganizations, fetchMembers as fetchMembersApi, inviteMember, removeMember } from "@/services/organizations"
import { fetchContactCategories, createContactCategory, updateContactCategory, deleteContactCategory, fetchCustomFieldDefinitions, createCustomFieldDefinition, updateCustomFieldDefinition, deleteCustomFieldDefinition } from "@/services/contacts"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Building2, UserPlus, Trash2, Loader2, Plus, Pencil } from "lucide-react"
import type { MembersResponse, ContactCategory, CustomFieldDefinition } from "@/types"

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texte",
  long_text: "Texte long",
  number: "Nombre",
  date: "Date",
  select: "Sélection",
  email: "Email",
  phone: "Téléphone",
  url: "URL",
  checkbox: "Case à cocher",
}

export default function OrganizationSettingsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<MembersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Categories state
  const [categories, setCategories] = useState<ContactCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ContactCategory | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [categoryColor, setCategoryColor] = useState("#3b82f6")
  const [savingCategory, setSavingCategory] = useState(false)

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [customFieldsLoading, setCustomFieldsLoading] = useState(true)
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [fieldLabel, setFieldLabel] = useState("")
  const [fieldType, setFieldType] = useState("text")
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldOptions, setFieldOptions] = useState("")
  const [savingField, setSavingField] = useState(false)

  useEffect(() => {
    async function fetchOrg() {
      try {
        const orgs = await fetchOrganizations()
        if (orgs.length > 0) setOrgId(orgs[0].id)
      } catch {
        // silently fail
      }
    }
    fetchOrg()
  }, [])

  const fetchMembers = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetchMembersApi(orgId)
      setData(res)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const res = await fetchContactCategories()
      setCategories(res)
    } catch {
      // silently fail
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Fetch custom fields
  const fetchCustomFields = useCallback(async () => {
    setCustomFieldsLoading(true)
    try {
      const res = await fetchCustomFieldDefinitions()
      setCustomFields(res)
    } catch {
      // silently fail
    } finally {
      setCustomFieldsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomFields()
  }, [fetchCustomFields])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setInviting(true)
    try {
      await inviteMember(orgId, { email: inviteEmail, role: inviteRole })
      setInviteEmail("")
      setDialogOpen(false)
      fetchMembers()
    } catch (err) {
      console.error("Failed to invite:", err)
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!orgId) return
    if (!confirm("Retirer ce membre de l'organisation ?")) return
    try {
      await removeMember(orgId, userId)
      fetchMembers()
    } catch (err) {
      console.error("Failed to remove:", err)
    }
  }

  // Category CRUD
  const openCategoryDialog = (category?: ContactCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryName(category.name)
      setCategoryColor(category.color)
    } else {
      setEditingCategory(null)
      setCategoryName("")
      setCategoryColor("#3b82f6")
    }
    setCategoryDialogOpen(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCategory(true)
    try {
      if (editingCategory) {
        await updateContactCategory(editingCategory.id, { name: categoryName, color: categoryColor })
      } else {
        await createContactCategory({ name: categoryName, color: categoryColor })
      }
      setCategoryDialogOpen(false)
      fetchCategories()
    } catch (err) {
      console.error("Failed to save category:", err)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (category: ContactCategory) => {
    if (category.is_default) return
    if (!confirm(`Supprimer la catégorie "${category.name}" ?`)) return
    try {
      await deleteContactCategory(category.id)
      fetchCategories()
    } catch (err) {
      console.error("Failed to delete category:", err)
    }
  }

  // Custom field CRUD
  const openFieldDialog = (field?: CustomFieldDefinition) => {
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
    setFieldDialogOpen(true)
  }

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingField(true)
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
      setFieldDialogOpen(false)
      fetchCustomFields()
    } catch (err) {
      console.error("Failed to save custom field:", err)
    } finally {
      setSavingField(false)
    }
  }

  const handleDeleteField = async (field: CustomFieldDefinition) => {
    if (!confirm(`Supprimer le champ "${field.label}" ?`)) return
    try {
      await deleteCustomFieldDefinition(field.id)
      fetchCustomFields()
    } catch (err) {
      console.error("Failed to delete custom field:", err)
    }
  }

  const currentUserRole = data?.members.find(
    (m) => m.user_id === user?.id
  )?.role

  const isOwner = currentUserRole === "owner"

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight flex items-center gap-3">
            <Building2 className="h-7 w-7 text-primary" />
            Organisation
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Gérez les membres de votre organisation
          </p>
        </div>
        {(isOwner || currentUserRole === "admin") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Inviter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inviter un membre</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 font-[family-name:var(--font-body)]">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="membre@exemple.com"
                    required
                    className="h-11 bg-secondary/30 border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rôle</Label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5 text-sm"
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Envoyer l&apos;invitation
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-xl tracking-tight">
            Membres ({data?.members.length ?? 0})
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 font-[family-name:var(--font-body)]">
              {data?.members.map((member) => {
                const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase()
                return (
                  <div key={member.user_id} className="flex items-center gap-3 rounded-xl border border-border p-3.5 hover:bg-secondary/20 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/8 text-primary text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge variant={member.role === "owner" ? "default" : "secondary"} className="text-[10px] font-normal">
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemove(member.user_id)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending invitations */}
      {data?.invitations && data.invitations.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-xl tracking-tight">
              Invitations en attente ({data.invitations.length})
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-2 font-[family-name:var(--font-body)]">
              {data.invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Rôle : {inv.role} · Envoyée le{" "}
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-normal">En attente</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Categories */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Catégories de contacts</h2>
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            Organisez vos contacts par catégorie
          </p>
        </div>

        {categoriesLoading ? (
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
                    Défaut
                  </Badge>
                )}
                <button
                  onClick={() => openCategoryDialog(category)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {!category.is_default && (
                  <button
                    onClick={() => handleDeleteCategory(category)}
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
          onClick={() => openCategoryDialog()}
        >
          <Plus className="h-4 w-4" />
          Ajouter une catégorie
        </Button>

        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveCategory} className="space-y-4 font-[family-name:var(--font-body)]">
              <div className="space-y-2">
                <Label htmlFor="category-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nom
                </Label>
                <Input
                  id="category-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Nom de la catégorie"
                  required
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-color" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Couleur
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
                <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={savingCategory}>
                  {savingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCategory ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Custom Fields */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Champs personnalisés</h2>
          <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
            Définissez des champs additionnels pour vos contacts
          </p>
        </div>

        {customFieldsLoading ? (
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
                    Requis
                  </Badge>
                )}
                <button
                  onClick={() => openFieldDialog(field)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteField(field)}
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
          onClick={() => openFieldDialog()}
        >
          <Plus className="h-4 w-4" />
          Ajouter un champ
        </Button>

        <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingField ? "Modifier le champ" : "Nouveau champ personnalisé"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveField} className="space-y-4 font-[family-name:var(--font-body)]">
              <div className="space-y-2">
                <Label htmlFor="field-label" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Libellé
                </Label>
                <Input
                  id="field-label"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="Nom du champ"
                  required
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-type" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Type
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
                    Options
                  </Label>
                  <textarea
                    id="field-options"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    placeholder="Une option par ligne"
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
                  Champ requis
                </Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFieldDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={savingField}>
                  {savingField && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingField ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
