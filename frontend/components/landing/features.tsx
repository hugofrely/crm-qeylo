"use client"

import { motion } from "motion/react"
import {
  MessageSquare,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Workflow,
} from "lucide-react"
import { FeaturesIllustration } from "./illustrations"

const features = [
  {
    icon: MessageSquare,
    illustration: "chat" as const,
    title: "Chat IA intelligent",
    description:
      "Parlez naturellement. L'IA comprend vos intentions et execute les actions : creer un contact, deplacer un deal, planifier une relance. Plus de 9 outils integres.",
    color: "text-primary",
    bgColor: "bg-primary/8",
    accent: "#0D4F4F",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    icon: Users,
    illustration: "contacts" as const,
    title: "Contacts & Segments",
    description:
      "Base de contacts enrichie automatiquement. Segments dynamiques, detection de doublons intelligente, lead scoring et timeline complete.",
    color: "text-teal",
    bgColor: "bg-teal/8",
    accent: "#3D7A7A",
    span: "",
  },
  {
    icon: KanbanSquare,
    illustration: "pipeline" as const,
    title: "Pipeline & Deals",
    description:
      "Multi-pipeline personnalisable avec Kanban drag-and-drop. Entonnoir de conversion et suivi complet.",
    color: "text-warm",
    bgColor: "bg-warm/8",
    accent: "#C9946E",
    span: "",
  },
  {
    icon: CheckSquare,
    illustration: "tasks" as const,
    title: "Taches & Rappels",
    description:
      "Assignation a l'equipe, vue liste et calendrier, rappels automatiques. Ne ratez plus jamais une relance.",
    color: "text-primary",
    bgColor: "bg-primary/8",
    accent: "#0D4F4F",
    span: "",
  },
  {
    icon: Workflow,
    illustration: "ai" as const,
    title: "Workflows & Automations",
    description:
      "Automatisez vos processus : triggers sur deals, contacts ou taches, conditions personnalisees, actions automatiques.",
    color: "text-teal",
    bgColor: "bg-teal/8",
    accent: "#3D7A7A",
    span: "",
  },
  {
    icon: BarChart3,
    illustration: "dashboard" as const,
    title: "Dashboard & Rapports",
    description:
      "Dashboard personnalisable avec widgets KPI. Rapports custom, analyse du pipeline, suivi de performance en temps reel.",
    color: "text-warm",
    bgColor: "bg-warm/8",
    accent: "#C9946E",
    span: "lg:col-span-2",
  },
]

export function Features() {
  return (
    <section className="relative py-28 lg:py-36 grain" id="features">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Fonctionnalites
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl leading-[1.1]">
            Tout ce qu&apos;il faut.
            <br />
            <span className="text-muted-foreground">Rien de superflu.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">
            Un CRM pense pour ceux qui veulent passer moins de temps
            sur l&apos;administratif et plus sur ce qui compte.
          </p>
        </motion.div>

        {/* Bento grid layout */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const isLarge = feature.span.includes("row-span-2")
            const isWide = feature.span.includes("col-span-2")

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`group relative overflow-hidden rounded-2xl border border-border/50 transition-all duration-500 hover:border-primary/15 hover:-translate-y-1 ${feature.span}`}
                style={{
                  background: "linear-gradient(170deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.7)",
                }}
                whileHover={{
                  boxShadow: "0 20px 50px -12px rgba(13,79,79,0.1), 0 4px 20px -4px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.8)",
                }}
              >
                {/* Hover gradient overlay */}
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${feature.accent}06 0%, transparent 60%)`,
                  }}
                />

                <div className={`relative ${isLarge ? "p-8" : "p-6"}`}>
                  {/* Icon with accent ring */}
                  <div className="relative mb-5 w-fit">
                    <div
                      className="absolute inset-0 -m-1 rounded-2xl opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-40"
                      style={{ backgroundColor: feature.accent }}
                    />
                    <FeaturesIllustration variant={feature.illustration} />
                  </div>

                  <h3 className={`font-semibold ${isLarge ? "text-xl" : "text-lg"}`}>
                    {feature.title}
                  </h3>
                  <p className={`mt-2 leading-relaxed text-muted-foreground ${isLarge ? "text-base" : "text-sm"}`}>
                    {feature.description}
                  </p>

                  {/* Large card gets extra visual element */}
                  {isLarge && (
                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                      <span className="text-xs font-medium text-primary/60 uppercase tracking-wider">
                        Intelligence artificielle
                      </span>
                    </div>
                  )}

                  {/* Wide card gets accent bar */}
                  {isWide && !isLarge && (
                    <div className="mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-warm/40 to-transparent" />
                  )}
                </div>

                {/* Corner accent */}
                <div
                  className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.08]"
                  style={{ backgroundColor: feature.accent }}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
