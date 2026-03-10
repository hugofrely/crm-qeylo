"use client"

import { usePlanGate } from "@/contexts/PlanContext"
import { UpgradeModal } from "./UpgradeModal"

export function UpgradeModalWrapper() {
  const { modalOpen, setModalOpen, modalContext } = usePlanGate()

  return (
    <UpgradeModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      context={modalContext}
    />
  )
}
