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
      "Parlez naturellement et l'IA execute. Creer un contact, deplacer un deal, planifier un rappel — tout se fait en une phrase.",
    details: [
      "Comprehension du langage naturel en francais",
      "Plus de 9 outils integres : contacts, deals, taches, notes, dashboard",
      "Conversations multiples avec historique persistant",
      "Streaming en temps reel avec rendu Markdown",
    ],
  },
  {
    icon: Users,
    color: "#3D7A7A",
    illustration: "contacts" as const,
    title: "Contacts & Segments intelligents",
    description:
      "Vos contacts se creent et s'enrichissent automatiquement. Segmentez dynamiquement, detectez les doublons, et suivez chaque interaction.",
    details: [
      "Creation automatique depuis le chat",
      "Segments dynamiques avec regles personnalisees",
      "Detection de doublons intelligente avec fusion assistee",
      "Lead scoring (chaud, tiede, froid) et categories",
      "Timeline complete d'interactions par contact",
    ],
  },
  {
    icon: KanbanSquare,
    color: "#C9946E",
    illustration: "pipeline" as const,
    title: "Pipeline & Deals multi-pipeline",
    description:
      "Suivez vos deals sur un Kanban intuitif. Creez plusieurs pipelines, visualisez votre entonnoir de conversion, et filtrez avec precision.",
    details: [
      "Multi-pipeline : Prospection, Upsell, Partenariats...",
      "Glisser-deposer intuitif entre les etapes",
      "Entonnoir de conversion avec taux par etape",
      "Filtres avances : contact, montant, probabilite, dates",
    ],
  },
  {
    icon: CheckSquare,
    color: "#0D4F4F",
    illustration: "tasks" as const,
    title: "Taches, rappels & calendrier",
    description:
      "Gerez vos taches en liste ou en calendrier. Assignez a l'equipe, configurez des rappels automatiques, ne ratez plus rien.",
    details: [
      "Vue liste et vue calendrier",
      "Assignation aux membres de l'equipe",
      "Rappels automatiques configurables",
      "3 niveaux de priorite avec filtres avances",
      "Taches recurrentes",
    ],
  },
  {
    icon: Workflow,
    color: "#3D7A7A",
    illustration: "ai" as const,
    title: "Workflows & Automations",
    description:
      "Automatisez vos processus metier. Definissez des triggers, des conditions et des actions pour gagner du temps chaque jour.",
    details: [
      "Triggers : deal cree, etape changee, contact mis a jour...",
      "Conditions personnalisees et delais",
      "Actions automatiques sur contacts, deals, taches",
      "Templates de workflows prets a l'emploi",
    ],
  },
  {
    icon: BarChart3,
    color: "#C9946E",
    illustration: "dashboard" as const,
    title: "Dashboard & Rapports sur mesure",
    description:
      "Construisez votre dashboard avec des widgets personnalisables. Creez des rapports sur mesure pour suivre votre performance.",
    details: [
      "Dashboard personnalisable avec widgets drag-and-drop",
      "Rapports custom : performance, pipeline, activite, sources",
      "KPI en temps reel : CA, pipeline, taux de conversion",
      "Templates de rapports prets a l'emploi",
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
    title: "Integration email",
    description: "Connectez Gmail et Outlook en un clic",
  },
  {
    icon: Building2,
    title: "Multi-organisation",
    description: "Gerez plusieurs structures depuis un compte",
  },
  {
    icon: Package,
    title: "Produits & Catalogue",
    description: "Gerez vos produits, tarifs et categories",
  },
  {
    icon: Search,
    title: "Recherche globale",
    description: "Trouvez contacts, deals et taches instantanement",
  },
  {
    icon: Copy,
    title: "Detection de doublons",
    description: "Detection intelligente et fusion assistee",
  },
]

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Header with depth */}
        <section className="relative pt-32 pb-16 lg:pt-40 overflow-hidden">
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-teal-light opacity-30 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-warm-light opacity-30 blur-[80px]" />
            <div className="absolute inset-0 dot-grid opacity-[0.02]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                Fonctionnalites
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                Tout pour gerer vos clients.
                <br />
                <span className="bg-gradient-to-r from-primary via-teal to-warm bg-clip-text text-transparent">
                  En parlant.
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                Qeylo combine la puissance d&apos;un CRM complet avec la
                simplicite d&apos;une conversation.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Main features — alternating layout with depth */}
        <section className="pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="space-y-32">
              {mainFeatures.map((feature, index) => {
                const Icon = feature.icon
                const isReversed = index % 2 === 1
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6 }}
                    className={`grid items-center gap-12 md:grid-cols-2 md:gap-20 ${
                      isReversed
                        ? "md:[direction:rtl] md:[&>*]:[direction:ltr]"
                        : ""
                    }`}
                  >
                    <div>
                      <div
                        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${feature.color}12` }}
                      >
                        <Icon
                          className="h-7 w-7"
                          style={{ color: feature.color }}
                        />
                      </div>
                      <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
                        {feature.title}
                      </h2>
                      <p className="mt-4 leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>

                      {/* Separator */}
                      <div className="mt-6 h-px w-16 rounded-full" style={{ backgroundColor: `${feature.color}30` }} />

                      <ul className="mt-6 space-y-3">
                        {feature.details.map((detail) => (
                          <li
                            key={detail}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{
                                backgroundColor: `${feature.color}10`,
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

                    {/* Illustration with depth frame */}
                    <div className="relative">
                      <div className="absolute inset-0 -m-4 rounded-[2rem] opacity-40 blur-2xl" style={{ backgroundColor: `${feature.color}08` }} />
                      <div className="relative overflow-hidden rounded-2xl border border-border/30 shadow-xl shadow-primary/[0.03]">
                        <FeaturePageIllustration variant={feature.illustration} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Extra features strip */}
        <section className="relative border-t border-border/30 py-20 overflow-hidden grain">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {extraFeatures.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                    className="group text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.06] transition-all duration-300 group-hover:bg-primary/10 group-hover:shadow-lg group-hover:shadow-primary/[0.05]">
                      <Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <h3 className="mt-5 font-semibold">{feature.title}</h3>
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
