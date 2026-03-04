"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Globe,
  Pencil,
  Save,
  X,
  Loader2,
  Trash2,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  Tag,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Contact {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  source: string
  tags: string[]
  notes: string
  created_at: string
  updated_at: string
}

interface TimelineEntry {
  id: number
  contact: number
  deal: number | null
  entry_type: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTimelineIcon(entryType: string) {
  switch (entryType) {
    case "message":
    case "chat":
      return <MessageSquare className="h-4 w-4" />
    case "note":
      return <FileText className="h-4 w-4" />
    case "deal":
      return <DollarSign className="h-4 w-4" />
    case "call":
      return <Phone className="h-4 w-4" />
    case "email":
      return <Mail className="h-4 w-4" />
    default:
      return <Calendar className="h-4 w-4" />
  }
}

function getTimelineColor(entryType: string) {
  switch (entryType) {
    case "message":
    case "chat":
      return "bg-blue-100 text-blue-700"
    case "note":
      return "bg-yellow-100 text-yellow-700"
    case "deal":
      return "bg-green-100 text-green-700"
    case "call":
      return "bg-purple-100 text-purple-700"
    case "email":
      return "bg-orange-100 text-orange-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    source: "",
    notes: "",
  })

  const fetchContact = useCallback(async () => {
    try {
      const data = await apiFetch<Contact>(`/contacts/${id}/`)
      setContact(data)
      setFormData({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || "",
        phone: data.phone || "",
        company: data.company || "",
        source: data.source || "",
        notes: data.notes || "",
      })
    } catch (err) {
      console.error("Failed to fetch contact:", err)
    }
  }, [id])

  const fetchTimeline = useCallback(async () => {
    try {
      const data = await apiFetch<TimelineEntry[]>(`/timeline/?contact=${id}`)
      setTimeline(data)
    } catch (err) {
      console.error("Failed to fetch timeline:", err)
    }
  }, [id])

  useEffect(() => {
    Promise.all([fetchContact(), fetchTimeline()]).finally(() =>
      setLoading(false)
    )
  }, [fetchContact, fetchTimeline])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await apiFetch<Contact>(`/contacts/${id}/`, {
        method: "PATCH",
        json: formData,
      })
      setContact(data)
      setEditing(false)
    } catch (err) {
      console.error("Failed to update contact:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await apiFetch(`/contacts/${id}/`, { method: "DELETE" })
      router.push("/contacts")
    } catch (err) {
      console.error("Failed to delete contact:", err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">Contact introuvable.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push("/contacts")} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Retour aux contacts
      </Button>

      {/* Contact info card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-2xl">
              {contact.first_name} {contact.last_name}
            </CardTitle>
            <p className="text-muted-foreground text-sm mt-1">
              Cr&eacute;&eacute; le {formatDate(contact.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Supprimer le contact</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                      &Ecirc;tes-vous s&ucirc;r de vouloir supprimer{" "}
                      <strong>{contact.first_name} {contact.last_name}</strong> ?
                      Cette action est irr&eacute;versible.
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
                        {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Supprimer
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      first_name: contact.first_name,
                      last_name: contact.last_name,
                      email: contact.email || "",
                      phone: contact.phone || "",
                      company: contact.company || "",
                      source: contact.source || "",
                      notes: contact.notes || "",
                    })
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pr&eacute;nom</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>T&eacute;l&eacute;phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Entreprise</Label>
                <Input
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contact.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{contact.company}</span>
                  </div>
                )}
                {contact.source && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{contact.source}</span>
                  </div>
                )}
              </div>
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {contact.notes && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground font-medium mb-1">
                    Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Aucune interaction enregistr&eacute;e.
            </p>
          ) : (
            <div className="space-y-0">
              {timeline.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  {/* Timeline line and dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${getTimelineColor(
                        entry.entry_type
                      )}`}
                    >
                      {getTimelineIcon(entry.entry_type)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[24px]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-6 flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {entry.entry_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                      {entry.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
