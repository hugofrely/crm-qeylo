"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import type { Node } from "@xyflow/react"
import { TriggerConfig, ConditionConfig, ActionConfig, DelayConfig } from "./NodeConfigForms"

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

  return (
    <div className="w-80 border-l border-border bg-card h-full overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-medium">Configuration</h3>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 font-[family-name:var(--font-body)]">
        {nodeType === "trigger" && <TriggerConfig node={node} onUpdate={onUpdate} />}
        {nodeType === "condition" && <ConditionConfig node={node} onUpdate={onUpdate} />}
        {nodeType === "action" && <ActionConfig node={node} onUpdate={onUpdate} />}
        {nodeType === "delay" && <DelayConfig node={node} onUpdate={onUpdate} />}

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
            Supprimer ce n{"\u0153"}ud
          </Button>
        </div>
      </div>
    </div>
  )
}
