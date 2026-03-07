import { apiFetch } from "@/lib/api"
import type {
  SubscriptionDetail,
  UsageSummary,
  Invoice,
  PaymentMethod,
} from "@/types/subscriptions"

export async function fetchSubscription(): Promise<SubscriptionDetail> {
  return apiFetch<SubscriptionDetail>("/subscriptions/")
}

export async function fetchUsageSummary(): Promise<UsageSummary> {
  return apiFetch<UsageSummary>("/subscriptions/usage/")
}

export async function createCheckoutSession(plan: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/subscriptions/checkout/", {
    method: "POST",
    body: JSON.stringify({ plan }),
  })
}

export async function downgradeSubscription(plan: string): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/subscriptions/downgrade/", {
    method: "POST",
    body: JSON.stringify({ plan }),
  })
}

export async function cancelSubscription(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/subscriptions/cancel/", {
    method: "POST",
  })
}

export async function reactivateSubscription(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>("/subscriptions/reactivate/", {
    method: "POST",
  })
}

export async function fetchInvoices(): Promise<Invoice[]> {
  return apiFetch<Invoice[]>("/subscriptions/invoices/")
}

export async function fetchPaymentMethod(): Promise<PaymentMethod | null> {
  return apiFetch<PaymentMethod | null>("/subscriptions/payment-method/")
}

export async function updatePaymentMethod(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/subscriptions/update-payment-method/", {
    method: "POST",
  })
}
