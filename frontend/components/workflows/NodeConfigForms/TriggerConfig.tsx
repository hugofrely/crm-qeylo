"use client"

import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"

const TRIGGER_KEYS = [
  "deal.stage_changed",
  "deal.created",
  "deal.won",
  "deal.lost",
  "contact.created",
  "contact.updated",
  "contact.lead_score_changed",
  "task.created",
  "task.completed",
  "task.overdue",
  "email.sent",
  "note.added",
] as const

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function TriggerConfig({ node, onUpdate }: NodeConfigFormProps) {
  const t = useTranslations("workflows")
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
          {t("triggerConfig.triggerEvent")}
        </Label>
        <select
          value={nodeSubtype}
          onChange={(e) => updateSubtype(e.target.value)}
          className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
        >
          <option value="">{t("triggerConfig.choose")}</option>
          {TRIGGER_KEYS.map((key) => (
            <option key={key} value={key}>{t(`triggerLabels.${key.replace(/\./g, '_')}`)}</option>
          ))}
        </select>
      </div>

      {nodeSubtype === "deal.stage_changed" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("triggerConfig.stageFilter")}
          </Label>
          <Input
            value={(config.filters as Record<string, string>)?.new_stage_name || ""}
            onChange={(e) => updateConfig("filters", { ...((config.filters as Record<string, string>) || {}), new_stage_name: e.target.value })}
            placeholder="Ex: Negotiation"
            className="h-9 bg-secondary/30 border-border/60"
          />
        </div>
      )}
    </>
  )
}
