import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { useTranslations } from "next-intl"
import { Zap } from "lucide-react"

function TriggerNode({ data, selected }: NodeProps) {
  const t = useTranslations("workflows")
  const subtype = (data as Record<string, unknown>).node_subtype as string || ""
  const label = subtype ? (t(`triggerLabels.${subtype}` as any) || subtype) : t("nodes.trigger")

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
            {t("nodes.trigger")}
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
