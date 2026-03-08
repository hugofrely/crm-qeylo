"use client"

import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"

const OPERATOR_KEYS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
] as const

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function ConditionConfig({ node, onUpdate }: NodeConfigFormProps) {
  const t = useTranslations("workflows.conditionConfig")
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
          {t("field")}
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
          {t("operator")}
        </Label>
        <select
          value={(config.operator as string) || "equals"}
          onChange={(e) => updateConfig("operator", e.target.value)}
          className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
        >
          {OPERATOR_KEYS.map((key) => (
            <option key={key} value={key}>{t(`operatorLabels.${key}`)}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("value")}
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
