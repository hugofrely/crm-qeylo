"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { fetchUsageSummary } from "@/services/subscriptions"
import type { Plan, UsageSummary } from "@/types/subscriptions"
import {
  registerUpgradeModal,
  registerRefreshUsage,
  type QuotaKey,
  type UpgradeModalContext,
} from "@/lib/quota-error"

export type { QuotaKey, UpgradeModalContext }
export type QuotaStatus = "ok" | "warning" | "limit"

interface PlanContextValue {
  plan: Plan
  usage: UsageSummary | null
  loading: boolean
  isFeatureLocked: (feature: string) => boolean
  getQuotaStatus: (quota: QuotaKey) => QuotaStatus
  getQuotaInfo: (quota: QuotaKey) => { current: number; limit: number | null; percent: number }
  openUpgradeModal: (context: UpgradeModalContext) => void
  refreshUsage: () => Promise<void>
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
  modalContext: UpgradeModalContext | null
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalContext, setModalContext] = useState<UpgradeModalContext | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const refreshUsage = useCallback(async () => {
    try {
      const data = await fetchUsageSummary()
      setUsage(data)
    } catch (err) {
      console.error("Failed to fetch usage summary:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [refreshUsage])

  const openUpgradeModal = useCallback((context: UpgradeModalContext) => {
    setModalContext(context)
    setModalOpen(true)
  }, [])

  // Register with quota-error.ts so API errors can open the modal
  const openUpgradeModalRef = useRef(openUpgradeModal)
  openUpgradeModalRef.current = openUpgradeModal
  const refreshUsageRef = useRef(refreshUsage)
  refreshUsageRef.current = refreshUsage

  useEffect(() => {
    registerUpgradeModal((ctx) => openUpgradeModalRef.current(ctx))
    registerRefreshUsage(() => refreshUsageRef.current())
    return () => {
      registerUpgradeModal(null)
      registerRefreshUsage(null)
    }
  }, [])

  const plan = usage?.plan ?? "solo"

  const isFeatureLocked = useCallback(
    (feature: string): boolean => {
      if (!usage) return false
      return usage.features[feature] === false
    },
    [usage]
  )

  const getQuotaStatus = useCallback(
    (quota: QuotaKey): QuotaStatus => {
      if (!usage) return "ok"
      const item = usage[quota]
      if (item.limit === null) return "ok"
      if (item.limit === 0) return "limit"
      const percent = (item.current / item.limit) * 100
      if (percent >= 100) return "limit"
      if (percent >= 80) return "warning"
      return "ok"
    },
    [usage]
  )

  const getQuotaInfo = useCallback(
    (quota: QuotaKey): { current: number; limit: number | null; percent: number } => {
      if (!usage) return { current: 0, limit: null, percent: 0 }
      const item = usage[quota]
      const percent = item.limit === null ? 0 : item.limit === 0 ? 100 : (item.current / item.limit) * 100
      return { current: item.current, limit: item.limit, percent: Math.min(percent, 100) }
    },
    [usage]
  )

  const value: PlanContextValue = {
    plan,
    usage,
    loading,
    isFeatureLocked,
    getQuotaStatus,
    getQuotaInfo,
    openUpgradeModal,
    refreshUsage,
    modalOpen,
    setModalOpen,
    modalContext,
  }

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlanGate(): PlanContextValue {
  const context = useContext(PlanContext)
  if (!context) {
    throw new Error("usePlanGate must be used within a PlanProvider")
  }
  return context
}
