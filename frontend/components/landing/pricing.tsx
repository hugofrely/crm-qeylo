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
    description: "Parfait pour demarrer en solo",
    features: [
      "1 utilisateur",
      "100 contacts",
      "1 pipeline (6 etapes)",
      "Chat IA — 50 messages/mois",
      "Dashboard basique",
      "Taches & rappels",
      "Recherche globale",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    highlight: false,
    accent: "#3D7A7A",
  },
  {
    name: "Pro",
    price: "19",
    period: "/ mois",
    description: "Pour les independants qui grandissent",
    features: [
      "1 utilisateur",
      "Contacts illimites",
      "Multi-pipeline personnalisable",
      "Chat IA illimite",
      "Dashboard & rapports avances",
      "Workflows & automations",
      "Segments dynamiques",
      "Import/Export CSV",
      "Integration email",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    href: "/register",
    highlight: true,
    accent: "#0D4F4F",
  },
  {
    name: "Equipe",
    price: "49",
    period: "/ mois",
    description: "Pour les equipes ambitieuses",
    features: [
      "Utilisateurs illimites",
      "Tout du plan Pro",
      "Organisation partagee",
      "Roles & permissions",
      "Assignation de taches",
      "Rapports d'equipe",
      "API access",
      "Onboarding dedie",
    ],
    cta: "Contacter l'equipe",
    href: "/register",
    highlight: false,
    accent: "#C9946E",
  },
]

export function Pricing() {
  return (
    <section className="relative py-28 lg:py-36 grain" id="pricing">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-teal-light opacity-20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Tarifs
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl leading-[1.1]">
            Simple et
            <br />
            <span className="text-muted-foreground">transparent.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Commencez gratuitement. Evoluez quand vous etes pret.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-3 items-start">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-500 ${
                plan.highlight
                  ? "border-primary/15 scale-[1.03] z-10"
                  : "border-border/50 hover:-translate-y-1"
              }`}
              style={
                plan.highlight
                  ? {
                      background: "linear-gradient(170deg, rgba(255,255,255,0.95), rgba(232,244,244,0.6))",
                      boxShadow: "0 30px 70px -15px rgba(13,79,79,0.15), 0 8px 30px -8px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.9), inset 0 -1px 0 0 rgba(13,79,79,0.03)",
                    }
                  : {
                      background: "linear-gradient(170deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))",
                      boxShadow: "0 4px 20px -4px rgba(0,0,0,0.05), inset 0 1px 0 0 rgba(255,255,255,0.7)",
                    }
              }
            >
              {/* Gradient top bar */}
              <div
                className="h-1 w-full"
                style={{
                  background: `linear-gradient(90deg, ${plan.accent}, ${plan.accent}60)`,
                }}
              />

              {plan.highlight && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-3 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                  Populaire
                </div>
              )}

              <div className={`p-8 ${plan.highlight ? "pt-10" : ""}`}>
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight">
                      {plan.price}€
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div className="mt-8 h-px bg-gradient-to-r from-border via-border to-transparent" />

                <ul className="mt-8 flex-1 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5" style={{ backgroundColor: plan.accent + '10' }}>
                        <Check className="h-3 w-3" style={{ color: plan.accent }} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Button
                    asChild
                    className={`w-full rounded-full h-12 text-sm font-medium transition-all ${
                      plan.highlight
                        ? "shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.01]"
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
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
