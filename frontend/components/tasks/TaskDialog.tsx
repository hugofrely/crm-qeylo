"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2, Trash2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"

interface Contact {
  id: string
  first_name: string
  last_name: string
}

interface TaskData {
  id: string
  description: string
  due_date: string | null
  contact: string | null
  contact_name?: string | null
  deal: string | null
  deal_name?: string | null
  priority: string
  is_done: boolean
}

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: TaskData | null
  onSuccess: () => void
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: TaskDialogProps) {
  const isEditing = !!task

  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState("normal")
  const [contactId, setContactId] = useState("")
  const [contactLabel, setContactLabel] = useState("")
  const [contactQuery, setContactQuery] = useState("")
  const [contactResults, setContactResults] = useState<Contact[]>([])
  const [contactSearching, setContactSearching] = useState(false)
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contactWrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contactWrapperRef.current && !contactWrapperRef.current.contains(e.target as Node)) {
        setContactDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Debounced contact search
  const searchContacts = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setContactResults([])
      setContactDropdownOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setContactSearching(true)
      try {
        const data = await apiFetch<Contact[]>(`/contacts/search/?q=${encodeURIComponent(query)}`)
        setContactResults(Array.isArray(data) ? data : [])
        setContactDropdownOpen(true)
      } catch {
        setContactResults([])
      } finally {
        setContactSearching(false)
      }
    }, 300)
  }, [])

  useEffect(() => {
    if (open) {
      if (task) {
        setDescription(task.description)
        setDueDate(task.due_date ? task.due_date.split("T")[0] : "")
        setPriority(task.priority)
        setContactId(task.contact || "")
        setContactLabel(task.contact_name || "")
        setContactQuery("")
      } else {
        setDescription("")
        setDueDate("")
        setPriority("normal")
        setContactId("")
        setContactLabel("")
        setContactQuery("")
      }
      setContactResults([])
      setContactDropdownOpen(false)
    }
  }, [open, task])

  const handleSave = async () => {
    if (!description.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        description: description.trim(),
        due_date: dueDate || null,
        priority,
        contact: contactId || null,
      }

      if (isEditing) {
        await apiFetch(`/tasks/${task!.id}/`, {
          method: "PATCH",
          json: payload,
        })
      } else {
        await apiFetch("/tasks/", {
          method: "POST",
          json: payload,
        })
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error("Failed to save task:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!window.confirm("Supprimer cette tâche ? Cette action est irréversible.")) return
    setDeleting(true)
    try {
      await apiFetch(`/tasks/${task.id}/`, { method: "DELETE" })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error("Failed to delete task:", err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la tâche" : "Nouvelle tâche"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 font-[family-name:var(--font-body)]">
          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Input
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Appeler le client pour le devis"
            />
          </div>

          {/* Date + Priorité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">Date d&apos;échéance</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">Priorité</Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="high">Haute</option>
                <option value="normal">Normale</option>
                <option value="low">Basse</option>
              </select>
            </div>
          </div>

          {/* Contact autocomplete */}
          <div className="space-y-1.5">
            <Label>Contact associé</Label>
            <div ref={contactWrapperRef} className="relative">
              {contactId ? (
                <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm">
                  <span>{contactLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setContactId("")
                      setContactLabel("")
                      setContactQuery("")
                    }}
                    className="ml-2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={contactQuery}
                    onChange={(e) => {
                      setContactQuery(e.target.value)
                      searchContacts(e.target.value)
                    }}
                    onFocus={() => {
                      if (contactResults.length > 0) setContactDropdownOpen(true)
                    }}
                    placeholder="Rechercher un contact…"
                    className="pl-8"
                  />
                  {contactSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
              {contactDropdownOpen && contactResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                  {contactResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setContactId(c.id)
                        setContactLabel(`${c.first_name} ${c.last_name}`)
                        setContactQuery("")
                        setContactDropdownOpen(false)
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                    >
                      {c.first_name} {c.last_name}
                    </button>
                  ))}
                </div>
              )}
              {contactDropdownOpen && contactQuery && !contactSearching && contactResults.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                  Aucun contact trouvé
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {isEditing ? (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleSave}
            disabled={!description.trim() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
