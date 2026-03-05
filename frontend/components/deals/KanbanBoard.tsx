"use client"

import { useState, useEffect, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core"
import { updateDeal } from "@/services/deals"
import { usePipeline } from "@/hooks/useDeals"
import { KanbanColumn } from "./KanbanColumn"
import { DealCard } from "./DealCard"
import { DealDialog } from "./DealDialog"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { Deal } from "@/types"

interface KanbanBoardProps {
  pipelineId: string
  dialogOpen?: boolean
  onDialogOpenChange?: (open: boolean) => void
}

export function KanbanBoard({ pipelineId, dialogOpen, onDialogOpenChange }: KanbanBoardProps) {
  const { pipeline, setPipeline, loading, refresh } = usePipeline(pipelineId)
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

  // Custom collision: prioritize stage droppables (columns) over deal sortables
  const collisionDetection: CollisionDetection = (args) => {
    // First check if pointer is within a stage droppable
    const pointerCollisions = pointerWithin(args)
    const stageCollision = pointerCollisions.find((c) =>
      String(c.id).startsWith("stage-")
    )
    if (stageCollision) return [stageCollision]

    // Fallback to rect intersection
    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length > 0) return rectCollisions

    return pointerCollisions
  }

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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeDealId = String(active.id).replace("deal-", "")
    const activeStageId = findStageByDealId(activeDealId)

    let overStageId: string | undefined

    // Check if over a stage droppable
    if (String(over.id).startsWith("stage-")) {
      overStageId = String(over.id).replace("stage-", "")
    } else if (String(over.id).startsWith("deal-")) {
      // Over another deal — find which stage it's in
      const overDealId = String(over.id).replace("deal-", "")
      overStageId = findStageByDealId(overDealId)
    }

    if (!activeStageId || !overStageId || activeStageId === overStageId) return

    // Move the deal between stages in local state
    setPipeline((prev) => {
      const newPipeline = prev.map((stage) => ({
        ...stage,
        deals: [...stage.deals],
      }))

      const sourceStage = newPipeline.find((s) => s.stage.id === activeStageId)
      const targetStage = newPipeline.find((s) => s.stage.id === overStageId)
      if (!sourceStage || !targetStage) return prev

      const dealIndex = sourceStage.deals.findIndex((d) => d.id === activeDealId)
      if (dealIndex === -1) return prev

      const [deal] = sourceStage.deals.splice(dealIndex, 1)
      deal.stage = overStageId!
      deal.stage_name = targetStage.stage.name
      targetStage.deals.push(deal)

      return newPipeline
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event
    setActiveDeal(null)

    const dealId = String(active.id).replace("deal-", "")
    const newStageId = findStageByDealId(dealId)

    if (!newStageId) return

    // Persist the change
    try {
      await updateDeal(dealId, { stage: newStageId })
    } catch (err) {
      console.error("Failed to update deal stage:", err)
      // Re-fetch to restore correct state
      refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (pipeline.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-sm">
            Aucune &eacute;tape de pipeline configur&eacute;e. Cr&eacute;ez des &eacute;tapes dans
            les param&egrave;tres.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
        onSuccess={refresh}
      />
    </DndContext>
  )
}
