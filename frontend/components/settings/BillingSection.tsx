"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  fetchSubscription,
  fetchUsageSummary,
  fetchInvoices,
  fetchPaymentMethod,
  createCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  updatePaymentMethod,
} from "@/services/subscriptions"
import type {
  SubscriptionDetail,
  UsageSummary,
  Invoice,
  PaymentMethod,
} from "@/types/subscriptions"
import PlanCard from "./PlanCard"
import UsageBars from "./UsageBars"
import PaymentMethodCard from "./PaymentMethodCard"
import InvoiceList from "./InvoiceList"
import UpgradeModal from "./UpgradeModal"

interface BillingSectionProps {
  orgId: string
}

export default function BillingSection({ orgId }: BillingSectionProps) {
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const sub = await fetchSubscription()
      setSubscription(sub)

      const [usg, inv, pm] = await Promise.all([
        fetchUsageSummary().catch(() => null),
        fetchInvoices().catch(() => []),
        fetchPaymentMethod().catch(() => null),
      ])
      setUsage(usg)
      setInvoices(inv ?? [])
      setPaymentMethod(pm)
    } catch {
      toast.error("Impossible de charger les informations d'abonnement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUpgrade = async (plan: string) => {
    try {
      const { url } = await createCheckoutSession(plan)
      window.location.href = url
    } catch {
      toast.error("Erreur lors de la creation de la session de paiement")
      setUpgradeOpen(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("Etes-vous sur de vouloir annuler votre abonnement ?")) return
    try {
      const res = await cancelSubscription()
      toast.success(res.detail || "Abonnement annule")
      loadData()
    } catch {
      toast.error("Erreur lors de l'annulation")
    }
  }

  const handleReactivate = async () => {
    try {
      const res = await reactivateSubscription()
      toast.success(res.detail || "Abonnement reactive")
      loadData()
    } catch {
      toast.error("Erreur lors de la reactivation")
    }
  }

  const handleUpdatePayment = async () => {
    try {
      const { url } = await updatePaymentMethod()
      window.location.href = url
    } catch {
      toast.error("Erreur lors de la mise a jour du moyen de paiement")
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <CreditCard className="h-5 w-5 text-[#0D4F4F]" />
          Abonnement & Facturation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : subscription ? (
          <div className="space-y-6 animate-fade-in-up">
            <PlanCard
              subscription={subscription}
              onUpgrade={() => setUpgradeOpen(true)}
              onCancel={handleCancel}
              onReactivate={handleReactivate}
            />

            {usage && <UsageBars usage={usage} />}

            {subscription.plan !== "solo" && (
              <PaymentMethodCard
                paymentMethod={paymentMethod}
                onUpdate={handleUpdatePayment}
              />
            )}

            {invoices.length > 0 && <InvoiceList invoices={invoices} />}

            <UpgradeModal
              open={upgradeOpen}
              onOpenChange={setUpgradeOpen}
              onSelectPlan={handleUpgrade}
              currentPlan={subscription.plan}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Impossible de charger les informations d&apos;abonnement
          </p>
        )}
      </CardContent>
    </Card>
  )
}
