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
  { icon: Mail, title: "Email templates", description: "Modeles d'emails reutilisables et personnalisables" },
  { icon: Package, title: "Produits & Catalogue", description: "Gerez vos produits, tarifs et categories" },
  { icon: Search, title: "Recherche globale", description: "Trouvez contacts, deals et taches instantanement" },
  { icon: StickyNote, title: "Notes riches", description: "Editeur de notes complet sur chaque contact" },
  { icon: Copy, title: "Detection de doublons", description: "Detection intelligente et fusion assistee" },
  { icon: Building2, title: "Multi-organisation", description: "Gerez plusieurs structures depuis un compte" },
  { icon: Shield, title: "Roles & Permissions", description: "Controlez les acces de chaque membre" },
  { icon: Filter, title: "Entonnoir de conversion", description: "Visualisez vos taux de conversion par etape" },
  { icon: ListFilter, title: "Segments dynamiques", description: "Groupes de contacts avec regles automatiques" },
  { icon: Inbox, title: "Integration email", description: "Connectez Gmail et Outlook en un clic" },
  { icon: Bell, title: "Rappels & Notifications", description: "Alertes automatiques pour ne rien oublier" },
]

export function Everything() {
  return (
    <section className="relative py-28 lg:py-36 overflow-hidden">
      {/* Background with diagonal split */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

      {/* Large decorative number */}
      <div className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 text-[20rem] font-bold leading-none text-primary/[0.02] select-none hidden lg:block">
        12+
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-16 lg:grid-cols-[1fr_2fr] lg:items-start">
          {/* Left — sticky title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-28"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Et bien plus encore
            </span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl leading-[1.1]">
              Tout ce que
              <br />
              Qeylo peut
              <br />
              <span className="text-muted-foreground">faire.</span>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-sm">
              Un CRM complet avec tout ce dont vous avez besoin pour gerer et developper votre activite.
            </p>
            {/* Decorative element */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-12 w-1 rounded-full bg-gradient-to-b from-primary to-warm" />
              <div className="text-sm text-muted-foreground">
                <span className="block text-2xl font-bold text-foreground">12+</span>
                fonctionnalites integrees
              </div>
            </div>
          </motion.div>

          {/* Right — capability grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="group flex items-start gap-4 rounded-xl border border-border/40 p-5 transition-all duration-300 hover:border-primary/15 hover:-translate-y-1"
                  style={{
                    background: "linear-gradient(170deg, rgba(255,255,255,0.8), rgba(255,255,255,0.5))",
                    boxShadow: "0 2px 10px -3px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.6)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 15px 40px -10px rgba(13,79,79,0.08), 0 4px 15px -4px rgba(0,0,0,0.05), inset 0 1px 0 0 rgba(255,255,255,0.8)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 10px -3px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.6)"
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/[0.06] transition-colors duration-300 group-hover:bg-primary/10">
                    <Icon className="h-4.5 w-4.5 text-primary transition-transform duration-300 group-hover:scale-110" />
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
      </div>
    </section>
  )
}
