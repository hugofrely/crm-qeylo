import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { useTranslations } from "next-intl"
import { HelpCircle } from "lucide-react"

const OPERATOR_SYMBOLS: Record<string, string> = {
  equals: "=",
  not_equals: "\u2260",
  greater_than: ">",
  less_than: "<",
}

function ConditionNode({ data, selected }: NodeProps) {
  const t = useTranslations("workflows.nodes")
  const config = (data as Record<string, unknown>).config as Record<string, string> | undefined
  const field = config?.field || ""
  const operator = config?.operator || ""
  const value = config?.value || ""

  const operatorLabel = OPERATOR_SYMBOLS[operator] || (t(`operatorLabels.${operator}` as any) || operator)

  const summary = field
    ? `${field} ${operatorLabel} ${value}`
    : t("condition")

  return (
    <div
      className={`rounded-lg border-2 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 min-w-[180px] shadow-sm transition-shadow ${
        selected ? "border-amber-500 shadow-md" : "border-amber-300 dark:border-amber-700"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 text-white">
          <HelpCircle className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t("condition")}
          </div>
          <div className="text-xs font-medium text-foreground truncate max-w-[140px]">
            {summary}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "30%" }}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "70%" }}
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
      <div className="flex justify-between px-1 mt-1">
        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">{t("yes")}</span>
        <span className="text-[9px] text-red-500 dark:text-red-400 font-medium">{t("no")}</span>
      </div>
    </div>
  )
}

export default memo(ConditionNode)
