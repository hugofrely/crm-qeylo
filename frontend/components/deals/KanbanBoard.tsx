"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { apiFetch } from "@/lib/api"
import { KanbanColumn } from "./KanbanColumn"
import { DealCard } from "./DealCard"
import { DealDialog } from "./DealDialog"
import { Loader2 } from "lucide-react"

interface Deal {
  id: string
  name: string
  amount: string | number
  stage: string
  stage_name: string
  contact: string | null
  contact_name?: string
  probability?: number | null
  expected_close?: string | null
  notes?: string
}

interface Stage {
  id: string
  name: string
  order: number
  color: string
}

interface PipelineStage {
  stage: Stage
  deals: Deal[]
  total_amount: number | string
}

interface KanbanBoardProps {
  dialogOpen?: boolean
  onDialogOpenChange?: (open: boolean) => void
}

export function KanbanBoard({ dialogOpen, onDialogOpenChange }: KanbanBoardProps) {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [dealDialogOpen, setDealDialogOpen] = useState(false)

  // Sync external dialog control (for the "+ Nouveau deal" button in the page header)
  useEffect(() => {
    if (dialogOpen) {
      setSelectedDeal(null)
      setDealDialogOpen(true)
    }
  }, [dialogOpen])

  const handleDialogOpenChange = (open: boolean) => {
    setDealDialogOpen(open)
    if (!open) {
      setSelectedDeal(null)
      onDialogOpenChange?.(false)
    }
  }

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal)
    setDealDialogOpen(true)
  }

  const allStages = useMemo(
    () => pipeline.map((p) => p.stage),
    [pipeline]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const fetchPipeline = useCallback(async () => {
    try {
      const data = await apiFetch<PipelineStage[]>("/deals/pipeline/")
      setPipeline(data)
    } catch (err) {
      console.error("Failed to fetch pipeline:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  const findDealById = (dealId: string): Deal | undefined => {
    for (const stage of pipeline) {
      const deal = stage.deals.find((d) => d.id === dealId)
      if (deal) return deal
    }
    return undefined
  }

  const findStageByDealId = (dealId: string): string | undefined => {
    for (const stage of pipeline) {
      if (stage.deals.some((d) => d.id === dealId)) {
        return stage.stage.id
      }
    }
    return undefined
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const dealId = String(active.id).replace("deal-", "")
    const deal = findDealById(dealId)
    if (deal) setActiveDeal(deal)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)

    if (!over) return

    const dealId = String(active.id).replace("deal-", "")

    let targetStageId: string | undefined
    if (String(over.id).startsWith("stage-")) {
      targetStageId = String(over.id).replace("stage-", "")
    } else if (String(over.id).startsWith("deal-")) {
      const overDealId = String(over.id).replace("deal-", "")
      targetStageId = findStageByDealId(overDealId)
    }

    if (!targetStageId) return

    const currentStageId = findStageByDealId(dealId)
    if (!currentStageId || currentStageId === targetStageId) return

    // Optimistic update
    setPipeline((prev) => {
      const newPipeline = prev.map((stage) => ({
        ...stage,
        deals: [...stage.deals],
      }))

      const sourceStage = newPipeline.find((s) => s.stage.id === currentStageId)
      const targetStage = newPipeline.find((s) => s.stage.id === targetStageId)
      if (!sourceStage || !targetStage) return prev

      const dealIndex = sourceStage.deals.findIndex((d) => d.id === dealId)
      if (dealIndex === -1) return prev

      const [deal] = sourceStage.deals.splice(dealIndex, 1)
      deal.stage = targetStageId!
      deal.stage_name = targetStage.stage.name
      targetStage.deals.push(deal)

      return newPipeline
    })

    try {
      await apiFetch(`/deals/${dealId}/`, {
        method: "PATCH",
        json: { stage: targetStageId },
      })
    } catch (err) {
      console.error("Failed to update deal stage:", err)
      fetchPipeline()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (pipeline.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucune étape de pipeline configurée. Créez des étapes dans les paramètres.
        </p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {pipeline.map((stageData) => (
          <KanbanColumn
            key={stageData.stage.id}
            stage={stageData.stage}
            deals={stageData.deals}
            totalAmount={stageData.total_amount}
            onDealClick={handleDealClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <div className="w-72">
            <DealCard deal={activeDeal} />
          </div>
        ) : null}
      </DragOverlay>

      <DealDialog
        open={dealDialogOpen}
        onOpenChange={handleDialogOpenChange}
        deal={selectedDeal}
        stages={allStages}
        onSuccess={fetchPipeline}
      />
    </DndContext>
  )
}
