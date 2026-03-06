"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  ArrowRight,
  MessageSquare,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Workflow,
  FileSpreadsheet,
  Inbox,
  Building2,
  Package,
  Search,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { CTA } from "@/components/landing/cta"
import { FeaturePageIllustration } from "@/components/landing/illustrations"

const mainFeatures = [
  {
    icon: MessageSquare,
    color: "#0D4F4F",
    illustration: "chat" as const,
    title: "Chat IA — Votre assistant CRM",
    description:
      "Parlez naturellement et l'IA exécute. Créer un contact, déplacer un deal, planifier un rappel — tout se fait en une phrase.",
    details: [
      "Compréhension du langage naturel en français",
      "Plus de 9 outils intégrés : contacts, deals, tâches, notes, dashboard",
      "Conversations multiples avec historique persistant",
      "Streaming en temps réel avec rendu Markdown",
    ],
  },
  {
    icon: Users,
    color: "#3D7A7A",
    illustration: "contacts" as const,
    title: "Contacts & Segments intelligents",
    description:
      "Vos contacts se créent et s'enrichissent automatiquement. Segmentez dynamiquement, détectez les doublons, et suivez chaque interaction.",
    details: [
      "Création automatique depuis le chat",
      "Segments dynamiques avec règles personnalisées",
      "Détection de doublons intelligente avec fusion assistée",
      "Lead scoring (chaud, tiède, froid) et catégories",
      "Timeline complète d'interactions par contact",
    ],
  },
  {
    icon: KanbanSquare,
    color: "#C9946E",
    illustration: "pipeline" as const,
    title: "Pipeline & Deals multi-pipeline",
    description:
      "Suivez vos deals sur un Kanban intuitif. Créez plusieurs pipelines, visualisez votre entonnoir de conversion, et filtrez avec précision.",
    details: [
      "Multi-pipeline : Prospection, Upsell, Partenariats...",
      "Glisser-déposer intuitif entre les étapes",
      "Entonnoir de conversion avec taux par étape",
      "Filtres avancés : contact, montant, probabilité, dates",
    ],
  },
  {
    icon: CheckSquare,
    color: "#0D4F4F",
    illustration: "tasks" as const,
    title: "Tâches, rappels & calendrier",
    description:
      "Gérez vos tâches en liste ou en calendrier. Assignez à l'équipe, configurez des rappels automatiques, ne ratez plus rien.",
    details: [
      "Vue liste et vue calendrier",
      "Assignation aux membres de l'équipe",
      "Rappels automatiques configurables",
      "3 niveaux de priorité avec filtres avancés",
      "Tâches récurrentes",
    ],
  },
  {
    icon: Workflow,
    color: "#3D7A7A",
    illustration: "ai" as const,
    title: "Workflows & Automations",
    description:
      "Automatisez vos processus métier. Définissez des triggers, des conditions et des actions pour gagner du temps chaque jour.",
    details: [
      "Triggers : deal créé, étape changée, contact mis à jour...",
      "Conditions personnalisées et délais",
      "Actions automatiques sur contacts, deals, tâches",
      "Templates de workflows prêts à l'emploi",
    ],
  },
  {
    icon: BarChart3,
    color: "#C9946E",
    illustration: "dashboard" as const,
    title: "Dashboard & Rapports sur mesure",
    description:
      "Construisez votre dashboard avec des widgets personnalisables. Créez des rapports sur mesure pour suivre votre performance.",
    details: [
      "Dashboard personnalisable avec widgets drag-and-drop",
      "Rapports custom : performance, pipeline, activité, sources",
      "KPI en temps réel : CA, pipeline, taux de conversion",
      "Templates de rapports prêts à l'emploi",
    ],
  },
]

const extraFeatures = [
  {
    icon: FileSpreadsheet,
    title: "Import / Export CSV",
    description: "Importez et exportez vos contacts facilement",
  },
  {
    icon: Inbox,
    title: "Intégration email",
    description: "Connectez Gmail et Outlook en un clic",
  },
  {
    icon: Building2,
    title: "Multi-organisation",
    description: "Gérez plusieurs structures depuis un compte",
  },
  {
    icon: Package,
    title: "Produits & Catalogue",
    description: "Gérez vos produits, tarifs et catégories",
  },
  {
    icon: Search,
    title: "Recherche globale",
    description: "Trouvez contacts, deals et tâches instantanément",
  },
  {
    icon: Copy,
    title: "Détection de doublons",
    description: "Détection intelligente et fusion assistée",
  },
]

export default function FeaturesPage() {
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
                Fonctionnalités
              </span>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Tout pour gérer vos clients.
                <br />
                <span className="bg-gradient-to-r from-primary via-teal to-warm bg-clip-text text-transparent">
                  En parlant.
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                Qeylo combine la puissance d&apos;un CRM complet avec la
                simplicité d&apos;une conversation.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main features — alternating layout */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="space-y-24">
              {mainFeatures.map((feature, index) => {
                const Icon = feature.icon
                const isReversed = index % 2 === 1
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className={`grid items-center gap-12 md:grid-cols-2 md:gap-16 ${
                      isReversed
                        ? "md:[direction:rtl] md:[&>*]:[direction:ltr]"
                        : ""
                    }`}
                  >
                    <div>
                      <div
                        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${feature.color}15` }}
                      >
                        <Icon
                          className="h-7 w-7"
                          style={{ color: feature.color }}
                        />
                      </div>
                      <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
                        {feature.title}
                      </h2>
                      <p className="mt-4 leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                      <ul className="mt-6 space-y-3">
                        {feature.details.map((detail) => (
                          <li
                            key={detail}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{
                                backgroundColor: `${feature.color}15`,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: feature.color }}
                              />
                            </span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Illustration */}
                    <div className="overflow-hidden rounded-2xl">
                      <FeaturePageIllustration variant={feature.illustration} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Extra features strip */}
        <section className="border-t border-border/40 bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {extraFeatures.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  )
}
