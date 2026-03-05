"use client"

import { useState, useEffect, useCallback } from "react"
import type { PipelineStage, Stage } from "@/types"
import { fetchPipeline, fetchPipelineStages } from "@/services/deals"
import { useOrganization } from "@/lib/organization"

export function usePipeline() {
  const { orgVersion } = useOrganization()
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipeline()
      setPipeline(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { pipeline, setPipeline, loading, refresh }
}

export function usePipelineStages() {
  const { orgVersion } = useOrganization()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipelineStages()
      setStages(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { stages, setStages, loading, refresh }
}
