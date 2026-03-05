"use client"

import { useEffect, useState, useCallback } from "react"
import { apiFetch } from "@/lib/api"
import { fetchContactCategories } from "@/services/contacts"
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
import { Plus, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { ImportCSVDialog } from "@/components/contacts/ImportCSVDialog"
import type { Contact, ContactCategory } from "@/types"

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
  const [categories, setCategories] = useState<ContactCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile_phone: "",
    company: "",
    job_title: "",
    lead_score: "",
    city: "",
    postal_code: "",
    country: "",
    category_ids: [] as string[],
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
        const categoryParam = selectedCategory ? `&category=${selectedCategory}` : ""
        const data = await apiFetch<ContactsResponse>(
          `/contacts/?limit=${PAGE_SIZE}&offset=${offset}${categoryParam}`
        )
        setContacts(data.results)
        setTotalCount(data.count)
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    } finally {
      setLoading(false)
    }
  }, [search, page, selectedCategory])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts()
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchContacts, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [selectedCategory])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchContactCategories()
        setCategories(data)
      } catch (err) {
        console.error("Failed to fetch categories:", err)
      }
    }
    loadCategories()
  }, [])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiFetch("/contacts/", { method: "POST", json: formData })
      setFormData({ first_name: "", last_name: "", email: "", phone: "", mobile_phone: "", company: "", job_title: "", lead_score: "", city: "", postal_code: "", country: "", category_ids: [] })
      setDialogOpen(false)
      fetchContacts()
    } catch (err) {
      console.error("Failed to create contact:", err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {totalCount} contact{totalCount !== 1 ? "s" : ""} au total
          </p>
        </div>

        <div className="flex gap-2">
          <ImportCSVDialog onImported={fetchContacts} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
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
                  <Label htmlFor="first_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Prénom</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                    className="h-11 bg-secondary/30 border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Nom</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                    className="h-11 bg-secondary/30 border-border/60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Entreprise</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Poste</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  className="h-11 bg-secondary/30 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead_score" className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">Lead score</Label>
                <select
                  id="lead_score"
                  value={formData.lead_score}
                  onChange={(e) =>
                    setFormData({ ...formData, lead_score: e.target.value })
                  }
                  className="flex h-11 w-full rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">-- Aucun --</option>
                  <option value="hot">Chaud</option>
                  <option value="warm">Tiede</option>
                  <option value="cold">Froid</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-secondary/30 border-border/60"
        />
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors font-[family-name:var(--font-body)] ${
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 font-[family-name:var(--font-body)] ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
              {(cat.contact_count ?? 0) > 0 && (
                <span className="text-[10px] opacity-70">({cat.contact_count})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ContactTable contacts={contacts} />
      )}

      {/* Pagination */}
      {!search && totalPages > 1 && (
        <div className="flex items-center justify-between font-[family-name:var(--font-body)]">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="gap-1"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
