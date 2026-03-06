"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Trash2, Users, User, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchEmailTemplates, deleteEmailTemplate } from "@/services/emails"
import type { EmailTemplate } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "mine" | "shared">("all")
  const [loading, setLoading] = useState(true)

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
      toast.success("Template supprimé")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Templates d&apos;email</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Créez et gérez vos modèles d&apos;emails réutilisables
          </p>
        </div>
        <Link href="/settings/email-templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau template
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 font-[family-name:var(--font-body)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un template..."
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { key: "all" as const, label: "Tous" },
            { key: "mine" as const, label: "Mes templates", icon: User },
            { key: "shared" as const, label: "Partagés", icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                filter === key ? "bg-secondary text-foreground" : "hover:bg-secondary/50 text-muted-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm font-[family-name:var(--font-body)]">
            Aucun template trouvé
          </div>
        ) : (
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/settings/email-templates/${template.id}`}
              className="block rounded-xl border border-border bg-card hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="space-y-1 font-[family-name:var(--font-body)]">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{template.name}</p>
                    {template.is_shared && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Users className="h-3 w-3 mr-1" />
                        Partagé
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{template.subject}</p>
                  {template.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          <Tag className="h-2.5 w-2.5 mr-0.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete(template.id)
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
