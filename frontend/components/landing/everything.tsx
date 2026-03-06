"use client"

import { motion } from "motion/react"
import {
  FileSpreadsheet,
  Mail,
  Package,
  Search,
  StickyNote,
  Copy,
  Building2,
  Shield,
  Filter,
  ListFilter,
  Inbox,
  Bell,
} from "lucide-react"

const capabilities = [
  { icon: FileSpreadsheet, title: "Import / Export CSV", description: "Importez et exportez vos contacts en un clic" },
  { icon: Mail, title: "Email templates", description: "Modèles d'emails réutilisables et personnalisables" },
  { icon: Package, title: "Produits & Catalogue", description: "Gérez vos produits, tarifs et catégories" },
  { icon: Search, title: "Recherche globale", description: "Trouvez contacts, deals et tâches instantanément" },
  { icon: StickyNote, title: "Notes riches", description: "Éditeur de notes complet sur chaque contact" },
  { icon: Copy, title: "Détection de doublons", description: "Détection intelligente et fusion assistée" },
  { icon: Building2, title: "Multi-organisation", description: "Gérez plusieurs structures depuis un compte" },
  { icon: Shield, title: "Rôles & Permissions", description: "Contrôlez les accès de chaque membre" },
  { icon: Filter, title: "Entonnoir de conversion", description: "Visualisez vos taux de conversion par étape" },
  { icon: ListFilter, title: "Segments dynamiques", description: "Groupes de contacts avec règles automatiques" },
  { icon: Inbox, title: "Intégration email", description: "Connectez Gmail et Outlook en un clic" },
  { icon: Bell, title: "Rappels & Notifications", description: "Alertes automatiques pour ne rien oublier" },
]

export function Everything() {
  return (
    <section className="relative py-24 lg:py-32 bg-muted/30">
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
            Et bien plus encore
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tout ce que Qeylo peut faire
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Un CRM complet avec tout ce dont vous avez besoin pour gérer et développer votre activité.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {capabilities.map((item, index) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:border-primary/20"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
