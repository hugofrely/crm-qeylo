"use client"

import { KanbanBoard } from "@/components/deals/KanbanBoard"
import { Kanban } from "lucide-react"

export default function DealsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Kanban className="h-6 w-6" />
          Pipeline
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          G&eacute;rez vos deals par &eacute;tape du pipeline
        </p>
      </div>

      {/* Kanban Board */}
      <KanbanBoard />
    </div>
  )
}
