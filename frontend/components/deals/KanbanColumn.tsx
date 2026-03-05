"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { DealCard } from "./DealCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Deal, Stage } from "@/types"

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

  const dealIds = deals.map((d) => `deal-${d.id}`)

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: stage.color || "#6b7280" }}
          />
          <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatAmount(totalAmount)}
        </p>
      </div>

      {/* Droppable area */}
      <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 rounded-lg border-2 border-dashed p-2 space-y-2 min-h-[200px] transition-colors ${
            isOver
              ? "border-primary/50 bg-primary/5"
              : "border-transparent bg-muted/30"
          }`}
        >
          <ScrollArea className="h-full max-h-[calc(100vh-250px)]">
            <div className="space-y-2 pr-2">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} onClick={() => onDealClick?.(deal)} />
              ))}
              {deals.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  Aucun deal
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </SortableContext>
    </div>
  )
}
