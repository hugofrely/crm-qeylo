"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "@/components/deals/KanbanBoard"

export default function DealsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

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
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau deal
        </Button>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        dialogOpen={dialogOpen}
        onDialogOpenChange={setDialogOpen}
      />
    </div>
  )
}
