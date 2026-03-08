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
      "Produits & catalogue",
      "Email templates",
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

const comparisonData = [
  {
    category: "General",
    features: [
      { name: "Utilisateurs", solo: "1", pro: "1", equipe: "Illimite" },
      { name: "Contacts", solo: "100", pro: "Illimite", equipe: "Illimite" },
    ],
  },
  {
    category: "CRM",
    features: [
      { name: "Pipelines", solo: "1", pro: "Illimite", equipe: "Illimite" },
      { name: "Etapes personnalisables", solo: false, pro: true, equipe: true },
      { name: "Deals", solo: "Illimite", pro: "Illimite", equipe: "Illimite" },
      { name: "Segments dynamiques", solo: false, pro: true, equipe: true },
      { name: "Produits & catalogue", solo: false, pro: true, equipe: true },
      { name: "Detection de doublons", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "Productivite",
    features: [
      { name: "Taches & rappels", solo: true, pro: true, equipe: true },
      { name: "Vue calendrier", solo: true, pro: true, equipe: true },
      { name: "Assignation d'equipe", solo: false, pro: false, equipe: true },
      { name: "Workflows & automations", solo: false, pro: true, equipe: true },
      { name: "Email templates", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "IA",
    features: [
      { name: "Chat IA", solo: "50 msg/mois", pro: "Illimite", equipe: "Illimite" },
    ],
  },
  {
    category: "Analytics",
    features: [
      { name: "Dashboard", solo: "Basique", pro: "Avance", equipe: "Avance" },
      { name: "Rapports personnalises", solo: false, pro: true, equipe: true },
      { name: "Entonnoir de conversion", solo: false, pro: true, equipe: true },
    ],
  },
  {
    category: "Integrations",
    features: [
      { name: "Integration email", solo: false, pro: true, equipe: true },
      { name: "Import/Export CSV", solo: false, pro: true, equipe: true },
      { name: "API access", solo: false, pro: false, equipe: true },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email", solo: true, pro: true, equipe: true },
      { name: "Support prioritaire", solo: false, pro: true, equipe: true },
      { name: "Onboarding dedie", solo: false, pro: false, equipe: true },
    ],
  },
]

const faqs = [
  {
    question: "Puis-je changer de plan a tout moment ?",
    answer:
      "Oui, vous pouvez upgrader ou downgrader votre plan a tout moment. Le changement prend effet immediatement.",
  },
  {
    question: "Y a-t-il un engagement ?",
    answer:
      "Aucun engagement. Vous pouvez annuler a tout moment. Le plan gratuit reste disponible sans limite de temps.",
  },
  {
    question: "Mes donnees sont-elles securisees ?",
    answer:
      "Absolument. Vos donnees sont chiffrees, isolees par organisation, et hebergees en Europe. Authentification JWT avec refresh token.",
  },
  {
    question: "Quel modele d'IA est utilise ?",
    answer:
      "Claude (Anthropic) par defaut, avec GPT en fallback. Vous pouvez configurer le modele de votre choix via les parametres.",
  },
  {
    question: "Puis-je importer mes contacts existants ?",
    answer:
      "Oui, vous pouvez importer et exporter vos contacts au format CSV depuis la page Contacts. L'import inclut un mapping de colonnes intelligent.",
  },
  {
    question: "Quelles automations puis-je creer ?",
    answer:
      "Vous pouvez creer des workflows automatises bases sur des triggers : deal cree, etape changee, contact mis a jour, tache en retard, etc. Ajoutez des conditions et des actions automatiques comme envoyer un email, creer une tache, ou mettre a jour un champ.",
  },
  {
    question: "Puis-je connecter mon email ?",
    answer:
      "Oui ! Qeylo s'integre avec Gmail et Outlook via OAuth. Connectez votre boite mail en un clic depuis les parametres pour centraliser vos communications.",
  },
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Header with depth */}
        <section className="relative pt-32 pb-16 lg:pt-40 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-teal-light opacity-25 blur-[100px]" />
            <div className="absolute inset-0 dot-grid opacity-[0.02]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Tarifs
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                Simple et transparent
              </h1>
              <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
                Commencez gratuitement. Evoluez quand vous etes pret.
                <br />
                Aucune carte bancaire requise.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pb-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-6 md:grid-cols-3 items-start">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                  className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-500 ${
                    plan.highlight
                      ? "border-primary/20 bg-card shadow-2xl shadow-primary/[0.06] scale-[1.03] z-10"
                      : "border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/[0.03]"
                  }`}
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
                          {plan.price}&euro;
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {plan.period}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8 h-px bg-gradient-to-r from-border via-border to-transparent" />

                    <ul className="mt-8 flex-1 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm"
                        >
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

        {/* Comparison grid */}
        <section className="pb-28">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Comparaison detaillee
              </h2>
              <p className="mt-4 text-muted-foreground">
                Toutes les fonctionnalites, plan par plan.
              </p>
            </motion.div>

            <div className="overflow-x-auto rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="py-5 pl-6 pr-4 text-left text-sm font-medium text-muted-foreground w-[40%]">
                      Fonctionnalite
                    </th>
                    <th className="py-5 px-4 text-center text-sm font-semibold w-[20%]">Solo</th>
                    <th className="py-5 px-4 text-center text-sm font-semibold text-primary w-[20%]">Pro</th>
                    <th className="py-5 px-4 text-center text-sm font-semibold w-[20%]">Equipe</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((group) => (
                    <React.Fragment key={group.category}>
                      <tr>
                        <td
                          colSpan={4}
                          className="pt-8 pb-3 pl-6 text-xs font-bold uppercase tracking-[0.15em] text-primary"
                        >
                          {group.category}
                        </td>
                      </tr>
                      {group.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 pl-6 pr-4 text-sm">{feature.name}</td>
                          {(["solo", "pro", "equipe"] as const).map((plan) => {
                            const value = feature[plan]
                            return (
                              <td key={plan} className="py-3.5 px-4 text-center">
                                {value === true ? (
                                  <Check className="mx-auto h-4 w-4 text-primary" />
                                ) : value === false ? (
                                  <X className="mx-auto h-4 w-4 text-muted-foreground/50" />
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
        <section className="relative border-t border-border/30 py-28 overflow-hidden grain">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

          <div className="relative mx-auto max-w-3xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Questions frequentes
              </h2>
            </motion.div>

            <div className="mt-14 space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/15 hover:shadow-lg hover:shadow-primary/[0.03]"
                >
                  <h3 className="flex items-center gap-3 font-semibold">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.06]">
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    {faq.question}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground pl-10">
                    {faq.answer}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <p className="text-muted-foreground">
                Une autre question ?{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-primary font-medium underline-offset-4 hover:underline"
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
