"use client"

import { useRouter } from "next/navigation"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { User, DollarSign } from "lucide-react"
import { EntityLink } from "@/components/shared/EntityLink"
import type { Deal } from "@/types"

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
  const router = useRouter()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `deal-${deal.id}`,
    data: {
      type: "deal",
      deal,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleClick = () => {
    if (isDragging) return
    if (onClick) {
      onClick()
    } else {
      router.push(`/deals/${deal.id}`)
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm leading-tight">{deal.name}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
            <DollarSign className="h-3.5 w-3.5" />
            {formatAmount(deal.amount)}
          </div>
          {deal.contact_name && deal.contact && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <EntityLink type="contact" id={deal.contact} name={deal.contact_name} className="max-w-[100px]" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
