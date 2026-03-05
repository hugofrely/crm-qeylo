"use client"

import { useDroppable } from "@dnd-kit/core"
import { DealCard } from "./DealCard"

interface Deal {
  id: string
  name: string
  amount: string | number
  stage: string
  stage_name: string
  contact: string | null
  contact_name?: string
}

interface Stage {
  id: string
  name: string
  order: number
  color: string
}

interface KanbanColumnProps {
  stage: Stage
  deals: Deal[]
  totalAmount: number | string
  onDealClick?: (deal: Deal) => void
}

function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function KanbanColumn({ stage, deals, totalAmount, onDealClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: {
      type: "stage",
      stageId: stage.id,
    },
  })

  return (
    <div className="flex flex-col w-[280px] shrink-0">
      {/* Header */}
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: stage.color || "#6b7280" }}
          />
          <h3 className="font-medium text-sm truncate font-[family-name:var(--font-body)]">{stage.name}</h3>
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-muted-foreground px-1.5 font-[family-name:var(--font-body)]">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)] tabular-nums">
          {formatAmount(totalAmount)}
        </p>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-all duration-200 ${
          isOver
            ? "bg-primary/5 ring-2 ring-primary/20 ring-inset"
            : "bg-secondary/30"
        }`}
      >
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick?.(deal)} />
          ))}
          {deals.length === 0 && (
            <p className="text-center text-[11px] text-muted-foreground py-10 font-[family-name:var(--font-body)]">
              Aucun deal
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
