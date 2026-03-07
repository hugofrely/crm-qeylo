"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Loader2 } from "lucide-react"
import type { Plan } from "@/types/subscriptions"

interface PlanOption {
  id: Plan
  label: string
  price: string
  features: string[]
}

const plans: PlanOption[] = [
  {
    id: "pro",
    label: "Pro",
    price: "19\u20AC/mois",
    features: [
      "5 000 contacts",
      "10 pipelines",
      "3 utilisateurs",
      "500 messages IA/mois",
      "Import/Export CSV",
      "Champs personnalises",
    ],
  },
  {
    id: "team",
    label: "Equipe",
    price: "49\u20AC/mois",
    features: [
      "Contacts illimites",
      "Pipelines illimites",
      "10 utilisateurs",
      "2 000 messages IA/mois",
      "Toutes les fonctionnalites Pro",
      "Support prioritaire",
    ],
  },
]

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPlan: (plan: string) => void
  currentPlan: Plan
}

export default function UpgradeModal({ open, onOpenChange, onSelectPlan, currentPlan }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const availablePlans = plans.filter((p) => p.id !== currentPlan)

  const handleSelect = async (planId: string) => {
    setLoadingPlan(planId)
    onSelectPlan(planId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Changer de plan</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 font-[family-name:var(--font-body)]" style={{
          gridTemplateColumns: availablePlans.length > 1 ? "1fr 1fr" : "1fr",
        }}>
          {availablePlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-border p-5 space-y-4 hover:border-[#3D7A7A]/50 transition-colors"
            >
              <div>
                <h3 className="text-lg font-semibold">{plan.label}</h3>
                <p className="text-2xl font-bold text-[#0D4F4F] mt-1">
                  {plan.price}
                </p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-[#0D4F4F] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-[#0D4F4F] hover:bg-[#3D7A7A] text-white"
                onClick={() => handleSelect(plan.id)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Choisir ce plan
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
