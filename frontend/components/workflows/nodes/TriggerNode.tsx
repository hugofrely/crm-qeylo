import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Zap } from "lucide-react"

const TRIGGER_LABELS: Record<string, string> = {
  "deal.stage_changed": "Deal change de stage",
  "deal.created": "Deal cr\u00e9\u00e9",
  "deal.won": "Deal gagn\u00e9",
  "deal.lost": "Deal perdu",
  "contact.created": "Contact cr\u00e9\u00e9",
  "contact.updated": "Contact mis \u00e0 jour",
  "contact.lead_score_changed": "Lead score chang\u00e9",
  "task.created": "T\u00e2che cr\u00e9\u00e9e",
  "task.completed": "T\u00e2che compl\u00e9t\u00e9e",
  "task.overdue": "T\u00e2che en retard",
  "email.sent": "Email envoy\u00e9",
  "note.added": "Note ajout\u00e9e",
}

function TriggerNode({ data, selected }: NodeProps) {
  const subtype = (data as Record<string, unknown>).node_subtype as string || ""
  const label = TRIGGER_LABELS[subtype] || subtype || "Trigger"

  return (
    <div
      className={`rounded-lg border-2 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 min-w-[180px] shadow-sm transition-shadow ${
        selected ? "border-blue-500 shadow-md" : "border-blue-300 dark:border-blue-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 text-white">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Trigger
          </div>
          <div className="text-xs font-medium text-foreground">{label}</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  )
}

export default memo(TriggerNode)
