"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { Node } from "@xyflow/react"

const TRIGGER_OPTIONS = [
  { value: "deal.stage_changed", label: "Deal change de stage" },
  { value: "deal.created", label: "Deal créé" },
  { value: "deal.won", label: "Deal gagné" },
  { value: "deal.lost", label: "Deal perdu" },
  { value: "contact.created", label: "Contact créé" },
  { value: "contact.updated", label: "Contact mis à jour" },
  { value: "contact.lead_score_changed", label: "Lead score changé" },
  { value: "task.created", label: "Tâche créée" },
  { value: "task.completed", label: "Tâche complétée" },
  { value: "task.overdue", label: "Tâche en retard" },
  { value: "email.sent", label: "Email envoyé" },
  { value: "note.added", label: "Note ajoutée" },
]

const ACTION_OPTIONS = [
  { value: "create_task", label: "Créer une tâche" },
  { value: "send_notification", label: "Envoyer une notification" },
  { value: "create_note", label: "Créer une note" },
  { value: "move_deal", label: "Déplacer le deal" },
  { value: "update_contact", label: "Mettre à jour le contact" },
  { value: "send_email", label: "Envoyer un email" },
  { value: "webhook", label: "Webhook" },
]

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Égal à" },
  { value: "not_equals", label: "Différent de" },
  { value: "greater_than", label: "Supérieur à" },
  { value: "less_than", label: "Inférieur à" },
  { value: "contains", label: "Contient" },
  { value: "not_contains", label: "Ne contient pas" },
  { value: "is_empty", label: "Est vide" },
  { value: "is_not_empty", label: "N'est pas vide" },
]

const TEMPLATE_VARIABLES = [
  { group: "Contact", vars: ["contact.first_name", "contact.last_name", "contact.name", "contact.email", "contact.company", "contact.phone", "contact.lead_score"] },
  { group: "Deal", vars: ["deal.name", "deal.amount", "deal.stage", "deal.probability"] },
  { group: "Trigger", vars: ["trigger.deal_id", "trigger.contact_id", "trigger.new_stage_name", "trigger.old_stage_name"] },
]

interface NodeConfigPanelProps {
  node: Node
  onClose: () => void
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function NodeConfigPanel({ node, onClose, onUpdate }: NodeConfigPanelProps) {
  const nodeData = node.data as Record<string, unknown>
  const nodeType = nodeData.node_type as string
  const nodeSubtype = nodeData.node_subtype as string || ""
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

  const insertVariable = (variable: string, targetField: string) => {
    const current = (config[targetField] as string) || ""
    updateConfig(targetField, current + `{{${variable}}}`)
  }

  return (
    <div className="w-80 border-l border-border bg-card h-full overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-medium">Configuration</h3>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 font-[family-name:var(--font-body)]">
        {/* Trigger config */}
        {nodeType === "trigger" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Événement déclencheur
              </Label>
              <select
                value={nodeSubtype}
                onChange={(e) => updateSubtype(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
              >
                <option value="">Choisir...</option>
                {TRIGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {nodeSubtype === "deal.stage_changed" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filtre: nom du nouveau stage
                </Label>
                <Input
                  value={(config.filters as Record<string, string>)?.new_stage_name || ""}
                  onChange={(e) => updateConfig("filters", { ...((config.filters as Record<string, string>) || {}), new_stage_name: e.target.value })}
                  placeholder="Ex: Négociation"
                  className="h-9 bg-secondary/30 border-border/60"
                />
              </div>
            )}
          </>
        )}

        {/* Condition config */}
        {nodeType === "condition" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Champ
              </Label>
              <Input
                value={(config.field as string) || ""}
                onChange={(e) => updateConfig("field", e.target.value)}
                placeholder="Ex: deal.amount"
                className="h-9 bg-secondary/30 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Opérateur
              </Label>
              <select
                value={(config.operator as string) || "equals"}
                onChange={(e) => updateConfig("operator", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
              >
                {OPERATOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Valeur
              </Label>
              <Input
                value={(config.value as string) || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="Ex: 5000"
                className="h-9 bg-secondary/30 border-border/60"
              />
            </div>
          </>
        )}

        {/* Action config */}
        {nodeType === "action" && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Type d'action
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
                    placeholder="{{deal.name}} — {{deal.amount}}€"
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
                    Corps de l'email
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
        )}

        {/* Delay config */}
        {nodeType === "delay" && (
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Durée (en secondes)
            </Label>
            <Input
              type="number"
              value={(config.duration_seconds as number) || 3600}
              onChange={(e) => updateConfig("duration_seconds", parseInt(e.target.value) || 3600)}
              className="h-9 bg-secondary/30 border-border/60"
            />
            <p className="text-[10px] text-muted-foreground">
              3600 = 1h, 86400 = 1 jour, 604800 = 7 jours
            </p>
          </div>
        )}

        {/* Template variables */}
        {(nodeType === "action" || nodeType === "condition") && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Variables disponibles
            </Label>
            <div className="space-y-2">
              {TEMPLATE_VARIABLES.map((group) => (
                <div key={group.group}>
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">
                    {group.group}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.vars.map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${v}}}`)
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title={`Copier {{${v}}}`}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete node */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/8"
            onClick={() => {
              onUpdate(node.id, { _delete: true })
              onClose()
            }}
          >
            Supprimer ce nœud
          </Button>
        </div>
      </div>
    </div>
  )
}
