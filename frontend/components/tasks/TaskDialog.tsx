"use client"

import { useState, useEffect } from "react"
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
import type { Task } from "@/types"
import { createTask, updateTask, deleteTask } from "@/services/tasks"
import { useContactAutocomplete } from "@/hooks/useContactAutocomplete"
import { useMemberAutocomplete } from "@/hooks/useMemberAutocomplete"

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
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
  const [dueTime, setDueTime] = useState("")
  const [priority, setPriority] = useState("normal")
  const [contactId, setContactId] = useState("")
  const [contactLabel, setContactLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const contactAutocomplete = useContactAutocomplete()
  const memberAutocomplete = useMemberAutocomplete()
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      if (task) {
        setDescription(task.description)
        setDueDate(task.due_date ? task.due_date.split("T")[0] : "")
        const timeMatch = task.due_date?.match(/T(\d{2}:\d{2})/)
        setDueTime(timeMatch && timeMatch[1] !== "23:59" ? timeMatch[1] : "")
        setPriority(task.priority)
        setContactId(task.contact || "")
        setContactLabel(task.contact_name || "")
        setAssigneeIds(task.assignees ? task.assignees.map((a) => a.user_id) : [])
      } else {
        setDescription("")
        setDueDate("")
        setDueTime("")
        setPriority("normal")
        setContactId("")
        setContactLabel("")
        setAssigneeIds([])
      }
      contactAutocomplete.reset()
      memberAutocomplete.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  const handleSave = async () => {
    if (!description.trim()) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        description: description.trim(),
        due_date: dueDate ? `${dueDate}T${dueTime || "23:59"}:00Z` : null,
        priority,
        contact: contactId || null,
        assigned_to: assigneeIds,
      }

      if (isEditing) {
        await updateTask(task!.id, payload)
      } else {
        await createTask(payload)
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
      await deleteTask(task.id)
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
          <div className="grid grid-cols-3 gap-3">
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
              <Label htmlFor="task-due-time">Heure</Label>
              <Input
                id="task-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="Optionnel"
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
            <div ref={contactAutocomplete.wrapperRef} className="relative">
              {contactId ? (
                <div className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm">
                  <span>{contactLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setContactId("")
                      setContactLabel("")
                      contactAutocomplete.reset()
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
                    value={contactAutocomplete.query}
                    onChange={(e) => contactAutocomplete.search(e.target.value)}
                    onFocus={() => {
                      if (contactAutocomplete.results.length > 0) contactAutocomplete.setOpen(true)
                    }}
                    placeholder="Rechercher un contact…"
                    className="pl-8"
                  />
                  {contactAutocomplete.searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
              {contactAutocomplete.open && contactAutocomplete.results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                  {contactAutocomplete.results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setContactId(c.id)
                        setContactLabel(`${c.first_name} ${c.last_name}`)
                        contactAutocomplete.reset()
                      }}
                      className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                    >
                      {c.first_name} {c.last_name}
                    </button>
                  ))}
                </div>
              )}
              {contactAutocomplete.open && contactAutocomplete.query && !contactAutocomplete.searching && contactAutocomplete.results.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg px-3 py-3 text-sm text-muted-foreground text-center">
                  Aucun contact trouvé
                </div>
              )}
            </div>
          </div>

          {/* Assignés */}
          <div className="space-y-1.5">
            <Label>Assignés</Label>
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {assigneeIds.map((uid) => {
                  const member = memberAutocomplete.allMembers.find((m) => m.user_id === uid)
                  if (!member) return null
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium"
                    >
                      {member.first_name} {member.last_name}
                      <button
                        type="button"
                        onClick={() => setAssigneeIds((prev) => prev.filter((id) => id !== uid))}
                        className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <div ref={memberAutocomplete.wrapperRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={memberAutocomplete.query}
                  onChange={(e) => memberAutocomplete.search(e.target.value)}
                  onFocus={() => memberAutocomplete.search(memberAutocomplete.query)}
                  placeholder="Rechercher un membre…"
                  className="pl-8"
                />
              </div>
              {memberAutocomplete.open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-48 overflow-y-auto">
                  {memberAutocomplete.results
                    .filter((m) => !assigneeIds.includes(m.user_id))
                    .map((m) => (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          setAssigneeIds((prev) => [...prev, m.user_id])
                          memberAutocomplete.reset()
                        }}
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-secondary/50 transition-colors text-left"
                      >
                        {m.first_name} {m.last_name}
                        <span className="ml-auto text-xs text-muted-foreground">{m.email}</span>
                      </button>
                    ))}
                  {memberAutocomplete.results.filter((m) => !assigneeIds.includes(m.user_id)).length === 0 && (
                    <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                      {memberAutocomplete.query ? "Aucun membre trouvé" : "Tous les membres sont déjà assignés"}
                    </div>
                  )}
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
