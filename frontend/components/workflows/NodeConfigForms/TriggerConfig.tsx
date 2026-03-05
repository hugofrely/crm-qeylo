"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"

const TRIGGER_OPTIONS = [
  { value: "deal.stage_changed", label: "Deal change de stage" },
  { value: "deal.created", label: "Deal cr\u00e9\u00e9" },
  { value: "deal.won", label: "Deal gagn\u00e9" },
  { value: "deal.lost", label: "Deal perdu" },
  { value: "contact.created", label: "Contact cr\u00e9\u00e9" },
  { value: "contact.updated", label: "Contact mis \u00e0 jour" },
  { value: "contact.lead_score_changed", label: "Lead score chang\u00e9" },
  { value: "task.created", label: "T\u00e2che cr\u00e9\u00e9e" },
  { value: "task.completed", label: "T\u00e2che compl\u00e9t\u00e9e" },
  { value: "task.overdue", label: "T\u00e2che en retard" },
  { value: "email.sent", label: "Email envoy\u00e9" },
  { value: "note.added", label: "Note ajout\u00e9e" },
]

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function TriggerConfig({ node, onUpdate }: NodeConfigFormProps) {
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
          \u00c9v\u00e9nement d\u00e9clencheur
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
            placeholder="Ex: N\u00e9gociation"
            className="h-9 bg-secondary/30 border-border/60"
          />
        </div>
      )}
    </>
  )
}
