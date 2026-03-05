"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"

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

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function ConditionConfig({ node, onUpdate }: NodeConfigFormProps) {
  const nodeData = node.data as Record<string, unknown>
  const config = (nodeData.config as Record<string, unknown>) || {}

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, {
      ...nodeData,
      config: { ...config, [key]: value },
    })
  }

  return (
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
  )
}
