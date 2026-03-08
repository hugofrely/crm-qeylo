"use client"

import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function DelayConfig({ node, onUpdate }: NodeConfigFormProps) {
  const t = useTranslations("workflows.delayConfig")
  const nodeData = node.data as Record<string, unknown>
  const config = (nodeData.config as Record<string, unknown>) || {}

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, {
      ...nodeData,
      config: { ...config, [key]: value },
    })
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("duration")}
      </Label>
      <Input
        type="number"
        value={(config.duration_seconds as number) || 3600}
        onChange={(e) => updateConfig("duration_seconds", parseInt(e.target.value) || 3600)}
        className="h-9 bg-secondary/30 border-border/60"
      />
      <p className="text-[10px] text-muted-foreground">
        {t("hint")}
      </p>
    </div>
  )
}
