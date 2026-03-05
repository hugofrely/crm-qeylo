"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Check, ArrowRight, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

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

const faqs = [
  {
    question: "Puis-je changer de plan à tout moment ?",
    answer:
      "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Le changement prend effet immédiatement.",
  },
  {
    question: "Y a-t-il un engagement ?",
    answer:
      "Aucun engagement. Vous pouvez annuler à tout moment. Le plan gratuit reste disponible sans limite de temps.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Absolument. Vos données sont chiffrées, isolées par organisation, et hébergées en Europe. Authentification JWT avec refresh token.",
  },
  {
    question: "Quel modèle d'IA est utilisé ?",
    answer:
      "Claude (Anthropic) par défaut, avec GPT en fallback. Vous pouvez configurer le modèle de votre choix via les paramètres.",
  },
  {
    question: "Puis-je importer mes contacts existants ?",
    answer:
      "L'import CSV sera bientôt disponible. En attendant, vous pouvez les créer rapidement via le chat : « Ajoute Jean Dupont, jean@example.com, chez Acme ».",
  },
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Header */}
        <section className="pt-32 pb-16 lg:pt-40">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-medium uppercase tracking-widest text-[#F97316]">
                Tarifs
              </span>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Simple et transparent
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
                Commencez gratuitement. Évoluez quand vous êtes prêt.
                <br />
                Aucune carte bancaire requise.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
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
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm"
                      >
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

        {/* FAQ */}
        <section className="border-t border-border/40 bg-muted/30 py-24">
          <div className="mx-auto max-w-3xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight">
                Questions fréquentes
              </h2>
            </motion.div>

            <div className="mt-12 space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-xl border border-border/60 bg-card/50 p-6"
                >
                  <h3 className="flex items-center gap-3 font-semibold">
                    <HelpCircle className="h-4 w-4 text-[#F97316]" />
                    {faq.question}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground pl-7">
                    {faq.answer}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground">
                Une autre question ?{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-[#F97316] underline-offset-4 hover:underline"
                >
                  Contactez-nous
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
