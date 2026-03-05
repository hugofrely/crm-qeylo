"use client"

import { useDraggable } from "@dnd-kit/core"
import { User, DollarSign } from "lucide-react"

interface Deal {
  id: string
  name: string
  amount: string | number
  stage: string
  stage_name: string
  contact: string | null
  contact_name?: string
}

interface DealCardProps {
  deal: Deal
  onClick?: () => void
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

export function DealCard({ deal, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `deal-${deal.id}`,
    data: {
      type: "deal",
      deal,
    },
  })

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onClick?.() }}
      className="group rounded-xl border border-border bg-card p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-border/80 transition-all duration-200 font-[family-name:var(--font-body)]"
    >
      <p className="font-medium text-sm leading-tight">{deal.name}</p>
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
          <DollarSign className="h-3.5 w-3.5" />
          {formatAmount(deal.amount)}
        </div>
        {deal.contact_name && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[90px]">{deal.contact_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
