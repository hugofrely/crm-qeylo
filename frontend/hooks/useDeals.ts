"use client"

import { useState, useEffect, useCallback } from "react"
import type { Pipeline, PipelineStage, Stage } from "@/types"
import { fetchPipeline, fetchPipelineStages, fetchPipelines } from "@/services/deals"
import { useOrganization } from "@/lib/organization"

export function usePipelines() {
  const { orgVersion } = useOrganization()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipelines()
      setPipelines(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion])

  useEffect(() => { refresh() }, [refresh])

  return { pipelines, loading, refresh }
}

export function usePipeline(pipelineId?: string, filters?: Record<string, string>) {
  const { orgVersion } = useOrganization()
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  const filtersKey = filters ? JSON.stringify(filters) : ""

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipeline(pipelineId, filters)
      setPipeline(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion, pipelineId, filtersKey])

  useEffect(() => { refresh() }, [refresh])

  return { pipeline, setPipeline, loading, refresh }
}

export function usePipelineStages(pipelineId?: string) {
  const { orgVersion } = useOrganization()
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchPipelineStages(pipelineId)
      setStages(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgVersion, pipelineId])

  useEffect(() => { refresh() }, [refresh])

  return { stages, setStages, loading, refresh }
}
