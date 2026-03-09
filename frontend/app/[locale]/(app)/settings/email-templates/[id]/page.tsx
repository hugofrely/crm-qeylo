"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { EmailTemplateEditor } from "@/components/emails/EmailTemplateEditor"
import {
  fetchEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  renderEmailTemplate,
} from "@/services/emails"
import { toast } from "sonner"
import { sanitizeHtml } from "@/lib/sanitize"
import { ArrowLeft, Eye, Save, X } from "lucide-react"
import { Link } from "@/i18n/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function EmailTemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === "new"

  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [isShared, setIsShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewSubject, setPreviewSubject] = useState("")

  useEffect(() => {
    if (!isNew && params.id) {
      fetchEmailTemplate(params.id as string).then((t) => {
        setName(t.name)
        setSubject(t.subject)
        setBodyHtml(t.body_html)
        setTags(t.tags)
        setIsShared(t.is_shared)
      }).catch(() => {
        toast.error("Template introuvable")
        router.push("/settings/email-templates")
      }).finally(() => setLoading(false))
    }
  }, [params.id, isNew, router])

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Le nom et l'objet sont requis")
      return
    }
    setSaving(true)
    try {
      const data = { name, subject, body_html: bodyHtml, tags, is_shared: isShared }
      if (isNew) {
        const created = await createEmailTemplate(data)
        toast.success("Template créé")
        router.push(`/settings/email-templates/${created.id}`)
      } else {
        await updateEmailTemplate(params.id as string, data)
        toast.success("Template mis à jour")
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    if (isNew) {
      toast.error("Sauvegardez d'abord le template")
      return
    }
    try {
      const rendered = await renderEmailTemplate(params.id as string, {})
      setPreviewSubject(rendered.subject)
      setPreviewHtml(rendered.body_html)
      setPreviewOpen(true)
    } catch {
      toast.error("Erreur lors de la preview")
    }
  }

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput("")
  }

  return (
    <div className="p-8 lg:p-12 max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings/email-templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl tracking-tight">
            {isNew ? "Nouveau template" : "Modifier le template"}
          </h1>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6 space-y-5 font-[family-name:var(--font-body)]">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nom du template</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Relance après devis"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Objet de l&apos;email
              <span className="ml-1 text-muted-foreground/60">(supporte les variables)</span>
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Suite à notre échange, {{contact.first_name}}"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Corps de l&apos;email</Label>
            {!loading && <EmailTemplateEditor content={bodyHtml} onChange={setBodyHtml} />}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Ajouter un tag..."
                className="flex-1"
              />
              <Button variant="outline" onClick={addTag} type="button">
                Ajouter
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={isShared}
              onCheckedChange={(checked) => setIsShared(!!checked)}
            />
            <Label className="text-sm">Partager avec l&apos;organisation</Label>
          </div>
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewSubject}</DialogTitle>
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded-lg font-[family-name:var(--font-body)]"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
