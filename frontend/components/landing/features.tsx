"use client"

import { motion } from "motion/react"
import {
  MessageSquare,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Zap,
} from "lucide-react"
import { FeaturesIllustration } from "./illustrations"

const features = [
  {
    icon: MessageSquare,
    illustration: "chat" as const,
    title: "Chat intelligent",
    description:
      "Parlez naturellement. L'IA comprend vos intentions et exécute les actions : créer un contact, ajouter un deal, planifier une relance.",
    color: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    icon: Users,
    illustration: "contacts" as const,
    title: "Gestion des contacts",
    description:
      "Vos contacts se créent et s'organisent automatiquement. Historique complet, notes, et timeline d'interactions.",
    color: "text-teal",
    bgColor: "bg-teal/8",
  },
  {
    icon: KanbanSquare,
    illustration: "pipeline" as const,
    title: "Pipeline visuel",
    description:
      "Suivez vos deals sur un Kanban intuitif. Déplacez-les par glisser-déposer ou simplement en le disant au chat.",
    color: "text-warm",
    bgColor: "bg-warm/8",
  },
  {
    icon: CheckSquare,
    illustration: "tasks" as const,
    title: "Tâches & rappels",
    description:
      "Ne ratez plus aucune relance. L'IA crée vos tâches avec priorité et échéance depuis une simple conversation.",
    color: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    icon: BarChart3,
    illustration: "dashboard" as const,
    title: "Dashboard en temps réel",
    description:
      "Revenue, pipeline, taux de conversion — tout est calculé automatiquement. Posez la question, obtenez la réponse.",
    color: "text-teal",
    bgColor: "bg-teal/8",
  },
  {
    icon: Zap,
    illustration: "ai" as const,
    title: "IA configurable",
    description:
      "Claude, GPT, ou un autre modèle — choisissez votre IA préférée. Changez à tout moment via les paramètres.",
    color: "text-warm",
    bgColor: "bg-warm/8",
  },
]

export function Features() {
  return (
    <section className="relative py-24 lg:py-32" id="features">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            Fonctionnalités
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tout ce qu&apos;il faut.
            <br className="hidden sm:block" />
            Rien de superflu.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Un CRM pensé pour les freelances qui veulent passer moins de temps
            sur l&apos;administratif et plus sur ce qui compte.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="group relative rounded-2xl border border-border/60 bg-card/50 p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              <FeaturesIllustration variant={feature.illustration} />
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
