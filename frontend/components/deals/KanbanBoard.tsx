"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import { apiFetch } from "@/lib/api"
import { KanbanColumn } from "./KanbanColumn"
import { DealCard } from "./DealCard"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Deal {
  id: number
  name: string
  amount: string | number
  stage: number
  stage_name: string
  contact: number | null
  contact_name?: string
}

interface Stage {
  id: number
  name: string
  order: number
  color: string
}

interface PipelineStage {
  stage: Stage
  deals: Deal[]
  total_amount: number | string
}

export function KanbanBoard() {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)

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

  const findDealById = (dealId: number): Deal | undefined => {
    for (const stage of pipeline) {
      const deal = stage.deals.find((d) => d.id === dealId)
      if (deal) return deal
    }
    return undefined
  }

  const findStageByDealId = (dealId: number): number | undefined => {
    for (const stage of pipeline) {
      if (stage.deals.some((d) => d.id === dealId)) {
        return stage.stage.id
      }
    }
    return undefined
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const dealId = parseInt(String(active.id).replace("deal-", ""))
    const deal = findDealById(dealId)
    if (deal) setActiveDeal(deal)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeDealId = parseInt(String(active.id).replace("deal-", ""))
    const activeStageId = findStageByDealId(activeDealId)

    let overStageId: number | undefined

    // Check if over a stage droppable
    if (String(over.id).startsWith("stage-")) {
      overStageId = parseInt(String(over.id).replace("stage-", ""))
    } else if (String(over.id).startsWith("deal-")) {
      // Over another deal — find which stage it's in
      const overDealId = parseInt(String(over.id).replace("deal-", ""))
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

    const dealId = parseInt(String(active.id).replace("deal-", ""))
    const newStageId = findStageByDealId(dealId)

    if (!newStageId) return

    // Persist the change
    try {
      await apiFetch(`/deals/${dealId}/`, {
        method: "PATCH",
        json: { stage: newStageId },
      })
    } catch (err) {
      console.error("Failed to update deal stage:", err)
      // Re-fetch to restore correct state
      fetchPipeline()
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
      collisionDetection={closestCorners}
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
    </DndContext>
  )
}
