"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Node } from "@xyflow/react"
import { fetchEmailTemplates } from "@/services/emails"
import type { EmailTemplate } from "@/types"

const ACTION_KEYS = [
  "create_task",
  "send_notification",
  "create_note",
  "move_deal",
  "update_contact",
  "send_email",
  "webhook",
] as const

interface NodeConfigFormProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
}

export default function ActionConfig({ node, onUpdate }: NodeConfigFormProps) {
  const t = useTranslations("workflows.actionConfig")
  const nodeData = node.data as Record<string, unknown>
  const nodeSubtype = (nodeData.node_subtype as string) || ""
  const config = (nodeData.config as Record<string, unknown>) || {}

  const updateConfig = (key: string, value: unknown) => {
    onUpdate(node.id, {
      ...nodeData,
      config: { ...config, [key]: value },
    })
  }

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([])

  useEffect(() => {
    if (nodeSubtype === "send_email") {
      fetchEmailTemplates().then(setEmailTemplates).catch(() => {})
    }
  }, [nodeSubtype])

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
          {t("actionType")}
        </Label>
        <select
          value={nodeSubtype}
          onChange={(e) => updateSubtype(e.target.value)}
          className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
        >
          <option value="">{t("choose")}</option>
          {ACTION_KEYS.map((key) => (
            <option key={key} value={key}>{t(`actionLabels.${key}`)}</option>
          ))}
        </select>
      </div>

      {nodeSubtype === "create_task" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("description")}
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
              {t("dueDate")}
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
              {t("priority")}
            </Label>
            <select
              value={(config.priority as string) || "normal"}
              onChange={(e) => updateConfig("priority", e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
            >
              <option value="low">{t("priorityLow")}</option>
              <option value="normal">{t("priorityNormal")}</option>
              <option value="high">{t("priorityHigh")}</option>
            </select>
          </div>
        </>
      )}

      {nodeSubtype === "send_notification" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("notifTitle")}
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
              {t("message")}
            </Label>
            <textarea
              value={(config.message as string) || ""}
              onChange={(e) => updateConfig("message", e.target.value)}
              placeholder={"{{deal.name}} \u2014 {{deal.amount}}\u20AC"}
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm min-h-[80px] resize-none"
            />
          </div>
        </>
      )}

      {nodeSubtype === "create_note" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("content")}
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
            {t("targetStage")}
          </Label>
          <Input
            value={(config.stage_name as string) || ""}
            onChange={(e) => updateConfig("stage_name", e.target.value)}
            placeholder="Ex: Won"
            className="h-9 bg-secondary/30 border-border/60"
          />
        </div>
      )}

      {nodeSubtype === "send_email" && (
        <>
          {emailTemplates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("templateOptional")}
              </Label>
              <select
                value={(config.template_id as string) || ""}
                onChange={(e) => {
                  const templateId = e.target.value
                  updateConfig("template_id", templateId || null)
                  if (templateId) {
                    const tpl = emailTemplates.find((tmpl) => tmpl.id === templateId)
                    if (tpl) {
                      updateConfig("subject", tpl.subject)
                      updateConfig("body_template", tpl.body_html)
                    }
                  }
                }}
                className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm"
              >
                <option value="">{t("noTemplate")}</option>
                {emailTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("subject")}
            </Label>
            <Input
              value={(config.subject as string) || ""}
              onChange={(e) => updateConfig("subject", e.target.value)}
              placeholder="Welcome {{contact.first_name}}"
              className="h-9 bg-secondary/30 border-border/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("emailBody")}
            </Label>
            <textarea
              value={(config.body_template as string) || ""}
              onChange={(e) => updateConfig("body_template", e.target.value)}
              placeholder="Hello {{contact.first_name}}..."
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm min-h-[100px] resize-none"
            />
          </div>
        </>
      )}

      {nodeSubtype === "webhook" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("url")}
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
              {t("method")}
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
