import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { useTranslations } from "next-intl"
import { Clock } from "lucide-react"

function DelayNode({ data, selected }: NodeProps) {
  const t = useTranslations("workflows.nodes")
  const config = (data as Record<string, unknown>).config as Record<string, number> | undefined
  const seconds = config?.duration_seconds || 3600

  let durationLabel: string
  if (seconds >= 86400) {
    const days = Math.round(seconds / 86400)
    durationLabel = t("day", { count: days })
  } else if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600)
    durationLabel = t("hour", { count: hours })
  } else {
    const minutes = Math.round(seconds / 60)
    durationLabel = t("minute", { count: minutes })
  }

  const label = `${t("wait")} ${durationLabel}`

  return (
    <div
      className={`rounded-lg border-2 bg-gray-50 dark:bg-gray-800/30 px-4 py-3 min-w-[180px] shadow-sm transition-shadow ${
        selected ? "border-gray-500 shadow-md" : "border-gray-300 dark:border-gray-600"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-500 text-white">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("delay")}
          </div>
          <div className="text-xs font-medium text-foreground">{label}</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-900"
      />
    </div>
  )
}

export default memo(DelayNode)
