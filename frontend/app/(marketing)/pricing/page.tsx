"use client"

import React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { Check, ArrowRight, HelpCircle, X } from "lucide-react"
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
      "1 pipeline (6 étapes)",
      "Chat IA — 50 messages/mois",
      "Dashboard basique",
      "Tâches & rappels",
      "Recherche globale",
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
      "Multi-pipeline personnalisable",
      "Chat IA illimité",
      "Dashboard & rapports avancés",
      "Workflows & automations",
      "Segments dynamiques",
      "Produits & catalogue",
      "Email templates",
      "Import/Export CSV",
      "Intégration email",
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
    description: "Pour les équipes ambitieuses",
    features: [
      "Utilisateurs illimités",
      "Tout du plan Pro",
      "Organisation partagée",
      "Rôles & permissions",
      "Assignation de tâches",
      "Rapports d'équipe",
      "API access",
      "Onboarding dédié",
    ],
    cta: "Contacter l'équipe",
    href: "/register",
    highlight: false,
  },
]

const comparisonData = [
  {
    category: "Général",
    features: [
      { name: "Utilisateurs", solo: "1", pro: "1", equipe: "Illimité" },
      { name: "Contacts", solo: "100", pro: "Illimité", equipe: "Illimité" },
    ],
  },
  {
    category: "CRM",
    features: [
      { name: "Pipelines", solo: "1", pro: "Illimité", equipe: "Illimité" },
      { name: "Étapes personnalisables", solo: false, pro: true, equipe: true },
      { name: "Deals", solo: "Illimité", pro: "Illimité", equipe: "Illimité" },
      { name: "Segments dynamiques", solo: false, pro: true, equipe: true },
      { name: "Produits & catalogue", solo: false, pro: true, equipe: true },
      { name: "Détection de doublons", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "Productivité",
    features: [
      { name: "Tâches & rappels", solo: true, pro: true, equipe: true },
      { name: "Vue calendrier", solo: true, pro: true, equipe: true },
      { name: "Assignation d'équipe", solo: false, pro: false, equipe: true },
      { name: "Workflows & automations", solo: false, pro: true, equipe: true },
      { name: "Email templates", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "IA",
    features: [
      { name: "Chat IA", solo: "50 msg/mois", pro: "Illimité", equipe: "Illimité" },
    ],
  },
  {
    category: "Analytics",
    features: [
      { name: "Dashboard", solo: "Basique", pro: "Avancé", equipe: "Avancé" },
      { name: "Rapports personnalisés", solo: false, pro: true, equipe: true },
      { name: "Entonnoir de conversion", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "Intégrations",
    features: [
      { name: "Intégration email", solo: false, pro: true, equipe: true },
      { name: "Import/Export CSV", solo: false, pro: true, equipe: true },
      { name: "API access", solo: false, pro: false, equipe: true },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email", solo: true, pro: true, equipe: true },
      { name: "Support prioritaire", solo: false, pro: true, equipe: true },
      { name: "Onboarding dédié", solo: false, pro: false, equipe: true },
    ],
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
      "Oui, vous pouvez importer et exporter vos contacts au format CSV depuis la page Contacts. L'import inclut un mapping de colonnes intelligent.",
  },
  {
    question: "Quelles automations puis-je créer ?",
    answer:
      "Vous pouvez créer des workflows automatisés basés sur des triggers : deal créé, étape changée, contact mis à jour, tâche en retard, etc. Ajoutez des conditions et des actions automatiques comme envoyer un email, créer une tâche, ou mettre à jour un champ.",
  },
  {
    question: "Puis-je connecter mon email ?",
    answer:
      "Oui ! Qeylo s'intègre avec Gmail et Outlook via OAuth. Connectez votre boîte mail en un clic depuis les paramètres pour centraliser vos communications.",
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
              <span className="text-sm font-medium uppercase tracking-widest text-primary">
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
                      ? "border-primary/30 bg-gradient-to-b from-teal-light/40 to-transparent shadow-xl shadow-primary/5 scale-[1.02]"
                      : "border-border/60 bg-card/50"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
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
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button
                      asChild
                      className={`w-full rounded-full ${
                        plan.highlight
                          ? "shadow-lg shadow-primary/15"
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

        {/* Comparison grid */}
        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Comparaison détaillée
              </h2>
              <p className="mt-3 text-muted-foreground">
                Toutes les fonctionnalités, plan par plan.
              </p>
            </motion.div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="py-4 pr-4 text-left text-sm font-medium text-muted-foreground w-[40%]">
                      Fonctionnalité
                    </th>
                    <th className="py-4 px-4 text-center text-sm font-semibold w-[20%]">Solo</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold text-primary w-[20%]">Pro</th>
                    <th className="py-4 px-4 text-center text-sm font-semibold w-[20%]">Équipe</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((group) => (
                    <React.Fragment key={group.category}>
                      <tr>
                        <td
                          colSpan={4}
                          className="pt-8 pb-3 text-xs font-bold uppercase tracking-widest text-primary"
                        >
                          {group.category}
                        </td>
                      </tr>
                      {group.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-border/30">
                          <td className="py-3 pr-4 text-sm">{feature.name}</td>
                          {(["solo", "pro", "equipe"] as const).map((plan) => {
                            const value = feature[plan]
                            return (
                              <td key={plan} className="py-3 px-4 text-center">
                                {value === true ? (
                                  <Check className="mx-auto h-4 w-4 text-primary" />
                                ) : value === false ? (
                                  <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                                ) : (
                                  <span className="text-sm font-medium">{value}</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
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
                    <HelpCircle className="h-4 w-4 text-primary" />
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
                  className="text-primary underline-offset-4 hover:underline"
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
