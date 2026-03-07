"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"

const footerLinks = {
  Produit: [
    { label: "Fonctionnalites", href: "/features" },
    { label: "Tarifs", href: "/pricing" },
    { label: "Connexion", href: "/login" },
    { label: "Inscription", href: "/register" },
  ],
  Ressources: [
    { label: "Documentation", href: "#" },
    { label: "API", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Legal: [
    { label: "Mentions legales", href: "/mentions-legales" },
    { label: "Confidentialite", href: "/confidentialite" },
    { label: "CGU", href: "/cgu" },
  ],
}

export function Footer() {
  return (
    <footer className="relative border-t border-border/30 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand column — more presence */}
          <div>
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Qeylo
              </span>
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground max-w-[240px]">
              Le CRM conversationnel propulse par l&apos;IA,
              concu pour les independants et les entreprises.
            </p>
            {/* Decorative accent */}
            <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-primary to-warm opacity-40" />
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">{category}</h4>
              <ul className="mt-5 space-y-3.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Qeylo. Tous droits reserves.
          </p>
          <p className="text-xs text-muted-foreground">
            Fait avec soin pour ceux qui entreprennent
          </p>
        </div>
      </div>
    </footer>
  )
}
