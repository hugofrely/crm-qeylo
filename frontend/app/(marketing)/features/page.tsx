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
  Zap,
  Shield,
  Globe,
  Smartphone,
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
      "9 outils intégrés : contacts, deals, tâches, notes, dashboard",
      "Contexte persistant — l'IA connaît vos données récentes",
      "Modèle configurable : Claude, GPT, et plus",
    ],
  },
  {
    icon: Users,
    color: "#3D7A7A",
    illustration: "contacts" as const,
    title: "Gestion des contacts intelligente",
    description:
      "Vos contacts se créent et s'enrichissent automatiquement au fil de vos conversations. Recherche instantanée et historique complet.",
    details: [
      "Création automatique depuis le chat",
      "Recherche multi-champ instantanée",
      "Timeline d'interactions complète",
      "Notes et annotations libres",
    ],
  },
  {
    icon: KanbanSquare,
    color: "#C9946E",
    illustration: "pipeline" as const,
    title: "Pipeline visuel et interactif",
    description:
      "Suivez vos deals sur un Kanban que vous pouvez manipuler à la souris ou par le chat. 6 étapes par défaut, entièrement personnalisables.",
    details: [
      "Glisser-déposer intuitif",
      "Étapes personnalisables",
      "Montants et contacts liés",
      "Déplacement par commande vocale",
    ],
  },
  {
    icon: CheckSquare,
    color: "#0D4F4F",
    illustration: "tasks" as const,
    title: "Tâches et rappels automatiques",
    description:
      "L'IA crée vos tâches de suivi avec priorité et échéance. Ne ratez plus jamais une relance ou une action importante.",
    details: [
      "Création automatique depuis le chat",
      "3 niveaux de priorité",
      "Filtres : à faire, fait, tout",
      "Échéances avec dates précises",
    ],
  },
  {
    icon: BarChart3,
    color: "#3D7A7A",
    illustration: "dashboard" as const,
    title: "Dashboard en temps réel",
    description:
      "Votre activité résumée en un coup d'œil. Revenue, pipeline, deals par étape, tâches à venir.",
    details: [
      "Chiffre d'affaires et pipeline total",
      "Distribution des deals par étape",
      "Tâches à venir",
      "Interrogeable depuis le chat",
    ],
  },
  {
    icon: Zap,
    color: "#C9946E",
    illustration: "ai" as const,
    title: "IA configurable et évolutive",
    description:
      "Choisissez le modèle d'IA qui vous convient. Claude par défaut, avec fallback GPT. Changeable à tout moment.",
    details: [
      "Claude (Anthropic) par défaut",
      "GPT (OpenAI) en fallback",
      "Configuration via variables d'environnement",
      "Extensible à d'autres modèles",
    ],
  },
]

const extraFeatures = [
  {
    icon: Shield,
    title: "Sécurisé",
    description: "Auth JWT, données chiffrées, isolation par organisation",
  },
  {
    icon: Globe,
    title: "Multi-utilisateur",
    description: "Invitez votre équipe avec des rôles et permissions",
  },
  {
    icon: Smartphone,
    title: "Responsive",
    description: "Fonctionne sur desktop, tablette et mobile",
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
            <div className="grid gap-8 sm:grid-cols-3">
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
