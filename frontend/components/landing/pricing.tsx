"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Solo",
    price: "0",
    period: "Gratuit pour toujours",
    description: "Parfait pour démarrer en solo",
    features: [
      "1 utilisateur",
      "100 contacts",
      "Pipeline avec 6 étapes",
      "Chat IA — 50 messages/mois",
      "Dashboard basique",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "19",
    period: "/ mois",
    description: "Pour les freelances qui grandissent",
    features: [
      "1 utilisateur",
      "Contacts illimités",
      "Pipeline personnalisable",
      "Chat IA illimité",
      "Dashboard avancé",
      "Export CSV",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    href: "/register",
    highlight: true,
  },
  {
    name: "Équipe",
    price: "49",
    period: "/ mois",
    description: "Pour les petites structures",
    features: [
      "Jusqu'à 5 utilisateurs",
      "Tout du plan Pro",
      "Organisation partagée",
      "Rôles et permissions",
      "API access",
      "Onboarding dédié",
    ],
    cta: "Contacter l'équipe",
    href: "/register",
    highlight: false,
  },
]

export function Pricing() {
  return (
    <section className="relative py-24 lg:py-32" id="pricing">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-[#F97316]">
            Tarifs
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Simple et transparent
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Commencez gratuitement. Évoluez quand vous êtes prêt.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                plan.highlight
                  ? "border-[#F97316]/40 bg-gradient-to-b from-[#F97316]/[0.03] to-transparent shadow-xl shadow-[#F97316]/5 scale-[1.02]"
                  : "border-border/60 bg-card/50"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#F97316] px-4 py-1 text-xs font-semibold text-white">
                  Populaire
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {plan.price}€
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  asChild
                  className={`w-full rounded-full ${
                    plan.highlight
                      ? "bg-[#F97316] text-white hover:bg-[#EA580C] shadow-lg shadow-[#F97316]/20"
                      : ""
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
