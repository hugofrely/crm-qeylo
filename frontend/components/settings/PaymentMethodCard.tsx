"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard } from "lucide-react"
import type { PaymentMethod } from "@/types/subscriptions"
import { useTranslations } from "next-intl"

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod | null
  onUpdate: () => void
}

export default function PaymentMethodCard({ paymentMethod, onUpdate }: PaymentMethodCardProps) {
  const t = useTranslations("settings.billing")

  return (
    <Card className="border-border">
      <CardContent className="p-6 font-[family-name:var(--font-body)]">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
          {t("paymentMethod")}
        </h3>

        {paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/50">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium capitalize">
                  {paymentMethod.brand}
                </p>
                <p className="text-sm text-muted-foreground">
                  &bull;&bull;&bull;&bull; {paymentMethod.last4}
                  <span className="ml-3">
                    {t("expires")} {String(paymentMethod.exp_month).padStart(2, "0")}/{paymentMethod.exp_year}
                  </span>
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onUpdate}>
              {t("editPayment")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("noPaymentMethod")}
            </p>
            <Button variant="outline" size="sm" onClick={onUpdate}>
              {t("addPaymentMethod")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
