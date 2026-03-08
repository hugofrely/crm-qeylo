import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { useTranslations } from "next-intl"
import { Cog } from "lucide-react"

function ActionNode({ data, selected }: NodeProps) {
  const t = useTranslations("workflows")
  const subtype = (data as Record<string, unknown>).node_subtype as string || ""
  const label = subtype ? (t(`actionConfig.actionLabels.${subtype}` as any) || subtype) : t("nodes.action")

  return (
    <div
      className={`rounded-lg border-2 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 min-w-[180px] shadow-sm transition-shadow ${
        selected ? "border-emerald-500 shadow-md" : "border-emerald-300 dark:border-emerald-700"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-white">
          <Cog className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t("nodes.action")}
          </div>
          <div className="text-xs font-medium text-foreground">{label}</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  )
}

export default memo(ActionNode)
