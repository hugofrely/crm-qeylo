"use client"

import { motion } from "motion/react"
import { HowItWorksIllustration } from "./illustrations"

const steps = [
  {
    step: 1 as const,
    number: "01",
    title: "Dites ce que vous voulez",
    description:
      "Tapez en langage naturel : « Ajoute Marie de chez Acme, elle veut un devis pour 15k€ ». Pas de formulaire, pas de menu.",
  },
  {
    step: 2 as const,
    number: "02",
    title: "L'IA comprend et agit",
    description:
      "Qeylo analyse votre message, identifie les entités (contact, deal, montant) et exécute les actions en une seconde.",
  },
  {
    step: 3 as const,
    number: "03",
    title: "Tout est organisé",
    description:
      "Contact créé, deal ajouté au pipeline, tâche de suivi planifiée. Vérifiez dans les vues dédiées ou continuez à discuter.",
  },
]

export function HowItWorks() {
  return (
    <section className="relative py-24 lg:py-32 bg-muted/30">
      {/* Subtle top border gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            Comment ça marche
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Aussi simple que de parler
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line on desktop */}
              {index < steps.length - 1 && (
                <div className="absolute top-[88px] left-[calc(50%+60px)] hidden h-px w-[calc(100%-120px)] bg-gradient-to-r from-border via-primary/20 to-border md:block" />
              )}

              <div className="mx-auto w-fit">
                <HowItWorksIllustration step={step.step} />
              </div>

              <div className="mt-6">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Étape {step.number}
                </span>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
