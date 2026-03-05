"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"

const ACTION_OPTIONS = [
  { value: "create_task", label: "Créer une tâche" },
  { value: "send_notification", label: "Envoyer une notification" },
  { value: "create_note", label: "Créer une note" },
  { value: "move_deal", label: "Déplacer le deal" },
  { value: "update_contact", label: "Mettre à jour le contact" },
  { value: "send_email", label: "Envoyer un email" },
  { value: "webhook", label: "Webhook" },
]

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function ActionConfig({ node, onUpdate }: NodeConfigFormProps) {
  const nodeData = node.data as Record<string, unknown>
  const nodeSubtype = (nodeData.node_subtype as string) || ""
  const config = (nodeData.config as Record<string, unknown>) || {}

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, {
      ...nodeData,
      config: { ...config, [key]: value },
    })
  }

  const updateSubtype = (value: string) => {
    onUpdate(node.id, {
      ...nodeData,
      node_subtype: value,
    })
  }

  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Type d&apos;action
        </Label>
        <select
          value={nodeSubtype}
          onChange={(e) => updateSubtype(e.target.value)}
          className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
        >
          <option value="">Choisir...</option>
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {nodeSubtype === "create_task" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Input
              value={(config.description as string) || ""}
              onChange={(e) => updateConfig("description", e.target.value)}
              placeholder="Suivre {{contact.name}}"
              className="h-9 bg-secondary/30 border-border/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Échéance (offset)
            </Label>
            <Input
              value={(config.due_date_offset as string) || "+1d"}
              onChange={(e) => updateConfig("due_date_offset", e.target.value)}
              placeholder="+3d, +2h, +1w"
              className="h-9 bg-secondary/30 border-border/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Priorité
            </Label>
            <select
              value={(config.priority as string) || "normal"}
              onChange={(e) => updateConfig("priority", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
            >
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </div>
        </>
      )}

      {nodeSubtype === "send_notification" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Titre
            </Label>
            <Input
              value={(config.title as string) || ""}
              onChange={(e) => updateConfig("title", e.target.value)}
              placeholder="Notification..."
              className="h-9 bg-secondary/30 border-border/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Message
            </Label>
            <textarea
              value={(config.message as string) || ""}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder={"{{deal.name}} — {{deal.amount}}€"}
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm min-h-[80px] resize-none"
            />
          </div>
        </>
      )}

      {nodeSubtype === "create_note" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contenu
          </Label>
          <textarea
            value={(config.content as string) || ""}
            onChange={(e) => updateConfig("content", e.target.value)}
            placeholder="Note automatique..."
            className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm min-h-[80px] resize-none"
          />
        </div>
      )}

      {nodeSubtype === "move_deal" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Nom du stage cible
          </Label>
          <Input
            value={(config.stage_name as string) || ""}
            onChange={(e) => updateConfig("stage_name", e.target.value)}
            placeholder="Ex: Gagné"
            className="h-9 bg-secondary/30 border-border/60"
          />
        </div>
      )}

      {nodeSubtype === "send_email" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Objet
            </Label>
            <Input
              value={(config.subject as string) || ""}
              onChange={(e) => updateConfig("subject", e.target.value)}
              placeholder="Bienvenue {{contact.first_name}}"
              className="h-9 bg-secondary/30 border-border/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Corps de l&apos;email
            </Label>
            <textarea
              value={(config.body_template as string) || ""}
              onChange={(e) => updateConfig("body_template", e.target.value)}
              placeholder="Bonjour {{contact.first_name}}..."
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm min-h-[100px] resize-none"
            />
          </div>
        </>
      )}

      {nodeSubtype === "webhook" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              URL
            </Label>
            <Input
              value={(config.url as string) || ""}
              onChange={(e) => updateConfig("url", e.target.value)}
              placeholder="https://..."
              className="h-9 bg-secondary/30 border-border/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Méthode
            </Label>
            <select
              value={(config.method as string) || "POST"}
              onChange={(e) => updateConfig("method", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </>
      )}
    </>
  )
}
