"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
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
import {
  Building2,
  UserPlus,
  Trash2,
  Loader2,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Save,
  X,
} from "lucide-react"

interface Member {
  user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  joined_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface MembersResponse {
  members: Member[]
  invitations: PendingInvitation[]
}

interface PipelineStage {
  id: number
  name: string
  order: number
  color: string
}

interface ContactCategory {
  id: string
  name: string
  color: string
  icon: string
  order: number
  is_default: boolean
  contact_count: number
  created_at: string
}

interface CustomFieldDefinition {
  id: string
  label: string
  field_type: string
  is_required: boolean
  options: string[]
  order: number
  section: string
  created_at: string
}

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

  // Pipeline state
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [stagesLoading, setStagesLoading] = useState(true)
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [editingStageId, setEditingStageId] = useState<number | null>(null)
  const [stageEditForm, setStageEditForm] = useState({ name: "", color: "#6b7280" })
  const [newStage, setNewStage] = useState({ name: "", color: "#0D4F4F" })
  const [savingStage, setSavingStage] = useState(false)
  const [creatingStage, setCreatingStage] = useState(false)
  const [deleteStageDialog, setDeleteStageDialog] = useState<number | null>(null)
  const [deleteStageDealCount, setDeleteStageDealCount] = useState(0)
  const [deleteStageChecking, setDeleteStageChecking] = useState(false)
  const [deletingStage, setDeletingStage] = useState(false)
  const [migrateToStageId, setMigrateToStageId] = useState("")

  useEffect(() => {
    async function fetchOrg() {
      try {
        const orgs = await apiFetch<{ id: string; name: string }[]>("/organizations/")
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
      const res = await apiFetch<MembersResponse>(`/organizations/${orgId}/members/`)
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
      const res = await apiFetch<ContactCategory[]>("/contacts/categories/")
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

  // Fetch pipeline stages
  const fetchStages = useCallback(async () => {
    setStagesLoading(true)
    try {
      const res = await apiFetch<PipelineStage[]>("/pipeline-stages/")
      setStages(res.sort((a, b) => a.order - b.order))
    } catch {
      // silently fail
    } finally {
      setStagesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStages()
  }, [fetchStages])

  // Fetch custom fields
  const fetchCustomFields = useCallback(async () => {
    setCustomFieldsLoading(true)
    try {
      const res = await apiFetch<CustomFieldDefinition[]>("/contacts/custom-fields/")
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
      await apiFetch(`/organizations/${orgId}/invite/`, {
        method: "POST",
        json: { email: inviteEmail, role: inviteRole },
      })
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
      await apiFetch(`/organizations/${orgId}/members/${userId}/remove/`, {
        method: "DELETE",
      })
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
        await apiFetch(`/contacts/categories/${editingCategory.id}/`, {
          method: "PATCH",
          json: { name: categoryName, color: categoryColor },
        })
      } else {
        await apiFetch("/contacts/categories/", {
          method: "POST",
          json: { name: categoryName, color: categoryColor },
        })
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
      await apiFetch(`/contacts/categories/${category.id}/`, {
        method: "DELETE",
      })
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
        await apiFetch(`/contacts/custom-fields/${editingField.id}/`, {
          method: "PATCH",
          json: payload,
        })
      } else {
        await apiFetch("/contacts/custom-fields/", {
          method: "POST",
          json: payload,
        })
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
      await apiFetch(`/contacts/custom-fields/${field.id}/`, {
        method: "DELETE",
      })
      fetchCustomFields()
    } catch (err) {
      console.error("Failed to delete custom field:", err)
    }
  }

  // Pipeline CRUD
  const PRESET_COLORS = [
    "#0D4F4F", "#C44133", "#22c55e", "#C9946E", "#8b5cf6",
    "#ec4899", "#06b6d4", "#6b7280", "#f97316", "#14b8a6",
  ]

  const handleCreateStage = async () => {
    if (!newStage.name.trim()) return
    setCreatingStage(true)
    try {
      const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) : 0
      await apiFetch("/pipeline-stages/", {
        method: "POST",
        json: { ...newStage, order: maxOrder + 1 },
      })
      setNewStage({ name: "", color: "#0D4F4F" })
      setStageDialogOpen(false)
      fetchStages()
    } catch (err) {
      console.error("Failed to create stage:", err)
    } finally {
      setCreatingStage(false)
    }
  }

  const handleEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id)
    setStageEditForm({ name: stage.name, color: stage.color })
  }

  const handleSaveStageEdit = async () => {
    if (!editingStageId || !stageEditForm.name.trim()) return
    setSavingStage(true)
    try {
      await apiFetch(`/pipeline-stages/${editingStageId}/`, {
        method: "PATCH",
        json: stageEditForm,
      })
      setEditingStageId(null)
      fetchStages()
    } catch (err) {
      console.error("Failed to update stage:", err)
    } finally {
      setSavingStage(false)
    }
  }

  const handleOpenDeleteStageDialog = async (stageId: number) => {
    setDeleteStageDialog(stageId)
    setDeleteStageDealCount(0)
    setMigrateToStageId("")
    setDeleteStageChecking(true)
    try {
      await apiFetch(`/pipeline-stages/${stageId}/`, { method: "DELETE" })
      setDeleteStageDialog(null)
      fetchStages()
    } catch (err) {
      try {
        const error = JSON.parse((err as Error).message)
        if (error.deal_count) {
          setDeleteStageDealCount(error.deal_count)
        } else {
          setDeleteStageDialog(null)
        }
      } catch {
        setDeleteStageDialog(null)
      }
    } finally {
      setDeleteStageChecking(false)
    }
  }

  const handleDeleteStageWithMigration = async (stageId: number) => {
    if (!migrateToStageId) return
    setDeletingStage(true)
    try {
      await apiFetch(`/pipeline-stages/${stageId}/?migrate_to=${migrateToStageId}`, { method: "DELETE" })
      setDeleteStageDialog(null)
      fetchStages()
    } catch (err) {
      console.error("Failed to delete stage:", err)
    } finally {
      setDeletingStage(false)
    }
  }

  const handleReorderStage = async (stageId: number, direction: "up" | "down") => {
    const sorted = [...stages].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex((s) => s.id === stageId)
    if (index === -1) return
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return
    try {
      await Promise.all([
        apiFetch(`/pipeline-stages/${sorted[index].id}/`, {
          method: "PATCH",
          json: { order: sorted[swapIndex].order },
        }),
        apiFetch(`/pipeline-stages/${sorted[swapIndex].id}/`, {
          method: "PATCH",
          json: { order: sorted[index].order },
        }),
      ])
      fetchStages()
    } catch (err) {
      console.error("Failed to reorder stages:", err)
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

      {/* Pipeline Stages */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl tracking-tight">Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-1 font-[family-name:var(--font-body)]">
              Personnalisez les étapes de votre pipeline de vente
            </p>
          </div>
          <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle étape</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 font-[family-name:var(--font-body)]">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nom</Label>
                  <Input
                    value={newStage.name}
                    onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                    placeholder="Ex: Qualification"
                    className="h-11 bg-secondary/30 border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Couleur</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewStage({ ...newStage, color })}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          newStage.color === color
                            ? "border-foreground scale-110 shadow-md"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStageDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateStage} disabled={creatingStage || !newStage.name.trim()}>
                    {creatingStage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="p-6">
          {stagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : stages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10 font-[family-name:var(--font-body)]">
              Aucune étape configurée. Ajoutez votre première étape.
            </p>
          ) : (
            <div className="space-y-2 font-[family-name:var(--font-body)]">
              {stages.map((stage, index) => (
                <div key={stage.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="p-3.5">
                    {editingStageId === stage.id ? (
                      <div className="space-y-3">
                        <Input
                          value={stageEditForm.name}
                          onChange={(e) => setStageEditForm({ ...stageEditForm, name: e.target.value })}
                          className="h-9 bg-secondary/30 border-border/60"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setStageEditForm({ ...stageEditForm, color })}
                              className={`h-7 w-7 rounded-full border-2 transition-all ${
                                stageEditForm.color === color
                                  ? "border-foreground scale-110"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingStageId(null)} className="gap-1.5">
                            <X className="h-3.5 w-3.5" />
                            Annuler
                          </Button>
                          <Button size="sm" onClick={handleSaveStageEdit} disabled={savingStage || !stageEditForm.name.trim()} className="gap-1.5">
                            {savingStage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: stage.color || "#6b7280" }}
                        />
                        <span className="font-medium text-sm flex-1">{stage.name}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
                            disabled={index === 0}
                            onClick={() => handleReorderStage(stage.id, "up")}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
                            disabled={index === stages.length - 1}
                            onClick={() => handleReorderStage(stage.id, "down")}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            onClick={() => handleEditStage(stage)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors"
                            onClick={() => handleOpenDeleteStageDialog(stage.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete stage with migration dialog */}
      <Dialog
        open={deleteStageDialog !== null && (deleteStageChecking || deleteStageDealCount > 0)}
        onOpenChange={(open) => { if (!open) setDeleteStageDialog(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;étape</DialogTitle>
          </DialogHeader>
          {deleteStageChecking ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 font-[family-name:var(--font-body)]">
              <p className="text-sm text-muted-foreground">
                L&apos;étape <strong>{stages.find((s) => s.id === deleteStageDialog)?.name}</strong> contient{" "}
                <strong>{deleteStageDealCount} deal{deleteStageDealCount > 1 ? "s" : ""}</strong>.
                Choisissez une étape vers laquelle migrer ces deals avant la suppression.
              </p>
              <div className="space-y-1.5">
                <Label>Migrer les deals vers</Label>
                <select
                  value={migrateToStageId}
                  onChange={(e) => setMigrateToStageId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">— Sélectionner une étape —</option>
                  {stages
                    .filter((s) => s.id !== deleteStageDialog)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteStageDialog(null)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteStageDialog && handleDeleteStageWithMigration(deleteStageDialog)}
                  disabled={deletingStage || !migrateToStageId}
                >
                  {deletingStage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Migrer et supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
