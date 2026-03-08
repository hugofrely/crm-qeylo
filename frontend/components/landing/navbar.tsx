"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion, AnimatePresence } from "motion/react"
import { MessageSquare, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const t = useTranslations("marketing.navbar")
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: "/features" as const, label: t("features") },
    { href: "/pricing" as const, label: t("pricing") },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glassmorphism bar with subtle border */}
      <div className="border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20">
              <MessageSquare className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Qeylo</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group"
              >
                {link.label}
                {/* Hover underline effect */}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-primary/40 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" asChild className="rounded-full px-5">
              <Link href="/login">{t("login")}</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="rounded-full px-5 shadow-md shadow-primary/10 transition-all hover:shadow-lg hover:shadow-primary/15"
            >
              <Link href="/register">{t("startFree")}</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-b border-border/30 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2.5 border-t border-border/30 pt-5">
                <Button variant="outline" size="sm" asChild className="w-full rounded-full">
                  <Link href="/login">{t("login")}</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="w-full rounded-full shadow-md shadow-primary/10"
                >
                  <Link href="/register">{t("startFree")}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
