"use client"

import { KanbanBoard } from "@/components/deals/KanbanBoard"

export default function DealsPage() {
  return (
    <div className="p-8 lg:p-12 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            Gérez vos deals par étape du pipeline
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard />
    </div>
  )
}
