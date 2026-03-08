"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { MessageSquare } from "lucide-react"

export function Footer() {
  const t = useTranslations("marketing.footer")

  const footerLinks = {
    [t("product")]: [
      { label: t("productLinks.features"), href: "/features" as const },
      { label: t("productLinks.pricing"), href: "/pricing" as const },
      { label: t("productLinks.login"), href: "/login" as const },
      { label: t("productLinks.register"), href: "/register" as const },
    ],
    [t("resources")]: [
      { label: t("resourceLinks.documentation"), href: "#" as const },
      { label: t("resourceLinks.api"), href: "#" as const },
      { label: t("resourceLinks.changelog"), href: "#" as const },
    ],
    [t("legal")]: [
      { label: t("legalLinks.legalNotice"), href: "/mentions-legales" as const },
      { label: t("legalLinks.privacy"), href: "/confidentialite" as const },
      { label: t("legalLinks.terms"), href: "/cgu" as const },
    ],
  }

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
              {t("description")}
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
            &copy; {new Date().getFullYear()} {t("copyright")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("madeWith")}
          </p>
        </div>
      </div>
    </footer>
  )
}
