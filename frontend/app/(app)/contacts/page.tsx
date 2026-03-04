"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { ContactTable } from "@/components/contacts/ContactTable"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Users, Plus, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

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

interface ContactsResponse {
  count: number
  next: string | null
  previous: string | null
  results: Contact[]
}

const PAGE_SIZE = 20

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
  })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      if (search.trim()) {
        const results = await apiFetch<Contact[]>(
          `/contacts/search/?q=${encodeURIComponent(search.trim())}`
        )
        setContacts(results)
        setTotalCount(results.length)
      } else {
        const offset = (page - 1) * PAGE_SIZE
        const data = await apiFetch<ContactsResponse>(
          `/contacts/?limit=${PAGE_SIZE}&offset=${offset}`
        )
        setContacts(data.results)
        setTotalCount(data.count)
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchContacts, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiFetch("/contacts/", { method: "POST", json: formData })
      setFormData({ first_name: "", last_name: "", email: "", phone: "", company: "" })
      setDialogOpen(false)
      fetchContacts()
    } catch (err) {
      console.error("Failed to create contact:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Contacts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount} contact{totalCount !== 1 ? "s" : ""} au total
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Pr&eacute;nom</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">T&eacute;l&eacute;phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Entreprise</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Cr&eacute;er
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ContactTable contacts={contacts} />
      )}

      {/* Pagination */}
      {!search && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Pr&eacute;c&eacute;dent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
