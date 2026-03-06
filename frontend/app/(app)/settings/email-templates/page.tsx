"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, Trash2, Users, User, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchEmailTemplates, deleteEmailTemplate } from "@/services/emails"
import type { EmailTemplate } from "@/types"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { FilterPanel, FilterTriggerButton, FilterSection } from "@/components/shared/FilterPanel"
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable"

export default function EmailTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all")
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)

  const activeFilterCount = [search, filter !== "all" ? filter : ""].filter(Boolean).length

  const loadTemplates = async () => {
    try {
      const data = await fetchEmailTemplates({
        search: search || undefined,
        mine_only: filter === "mine" || undefined,
        shared_only: filter === "shared" || undefined,
      })
      setTemplates(data)
    } catch {
      toast.error("Erreur lors du chargement des templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [search, filter])

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce template ?")) return
    try {
      await deleteEmailTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success("Template supprime")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const columns: DataTableColumn<EmailTemplate>[] = [
    {
      key: "name",
      header: "Nom",
      render: (template) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{template.name}</span>
          {template.is_shared && (
            <Badge variant="secondary" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              Partage
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "subject",
      header: "Sujet",
      render: (template) => (
        <span className="text-sm text-muted-foreground">{template.subject}</span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (template) =>
        template.tags.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {template.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                <Tag className="h-2.5 w-2.5 mr-0.5" />
                {tag}
              </Badge>
            ))}
          </div>
        ) : null,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[50px]",
      className: "w-[50px]",
      render: (template) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete(template.id)
          }}
          className="text-muted-foreground hover:text-destructive transition-colors p-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <PageHeader
        title="Templates d'email"
        subtitle="Creez et gerez vos modeles d'emails reutilisables"
      >
        <FilterTriggerButton
          open={filterOpen}
          onOpenChange={setFilterOpen}
          activeFilterCount={activeFilterCount}
        />
        <Link href="/settings/email-templates/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau template
          </Button>
        </Link>
      </PageHeader>

      <div className="flex gap-0">
        <div className="flex-1 min-w-0 space-y-8">
          <DataTable
            columns={columns}
            data={templates}
            loading={loading}
            emptyMessage="Aucun template trouve"
            onRowClick={(template) => router.push(`/settings/email-templates/${template.id}`)}
            rowKey={(template) => template.id}
          />
        </div>

        <FilterPanel
          open={filterOpen}
          onOpenChange={setFilterOpen}
          onReset={() => { setSearch(""); setFilter("all") }}
          activeFilterCount={activeFilterCount}
        >
          <FilterSection label="Recherche">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un template..."
                className="pl-9 h-9 bg-secondary/30 border-border/60"
              />
            </div>
          </FilterSection>
          <FilterSection label="Type">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all" as const, label: "Tous" },
                { key: "mine" as const, label: "Mes templates", icon: User },
                { key: "shared" as const, label: "Partages", icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 font-[family-name:var(--font-body)] ${
                    filter === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {label}
                </button>
              ))}
            </div>
          </FilterSection>
        </FilterPanel>
      </div>
    </div>
  )
}
