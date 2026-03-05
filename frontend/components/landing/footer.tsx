"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"

const footerLinks = {
  Produit: [
    { label: "Fonctionnalités", href: "/features" },
    { label: "Tarifs", href: "/pricing" },
    { label: "Connexion", href: "/login" },
    { label: "Inscription", href: "/register" },
  ],
  Ressources: [
    { label: "Documentation", href: "#" },
    { label: "API", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Légal: [
    { label: "Mentions légales", href: "#" },
    { label: "Confidentialité", href: "#" },
    { label: "CGU", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <span className="text-xl tracking-tight">
                Qeylo
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Le CRM conversationnel
              <br />
              pour freelances.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold">{category}</h4>
              <ul className="mt-4 space-y-3">
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Qeylo. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Fait avec soin pour les freelances
          </p>
        </div>
      </div>
    </footer>
  )
}
