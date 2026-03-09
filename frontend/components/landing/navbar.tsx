"use client"

import { useState, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion, AnimatePresence } from "motion/react"
import Image from "next/image"
import {
  Menu,
  X,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Mail,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

const categories = [
  { key: "ai", href: "/features/ai" as const, icon: Sparkles, color: "#0D4F4F" },
  { key: "sales", href: "/features/sales" as const, icon: TrendingUp, color: "#C9946E" },
  { key: "contacts", href: "/features/contacts" as const, icon: Users, color: "#3D7A7A" },
  { key: "productivity", href: "/features/productivity" as const, icon: Zap, color: "#8B5CF6" },
  { key: "communication", href: "/features/communication" as const, icon: Mail, color: "#E5584A" },
]

export function Navbar() {
  const t = useTranslations("marketing.navbar")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState(false)
  const { user } = useAuth()
  const megaMenuTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMegaMenuEnter = useCallback(() => {
    if (megaMenuTimeout.current) {
      clearTimeout(megaMenuTimeout.current)
      megaMenuTimeout.current = null
    }
    setMegaMenuOpen(true)
  }, [])

  const handleMegaMenuLeave = useCallback(() => {
    megaMenuTimeout.current = setTimeout(() => {
      setMegaMenuOpen(false)
    }, 150)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glassmorphism bar with subtle border */}
      <div className="border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/images/qeylo-logo.webp"
              alt="Qeylo"
              width={36}
              height={36}
              className="rounded-xl transition-all group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/20"
              priority
            />
            <span className="text-xl font-semibold tracking-tight">Qeylo</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {/* Features link with mega menu */}
            <div
              onMouseEnter={handleMegaMenuEnter}
              onMouseLeave={handleMegaMenuLeave}
            >
              <Link
                href="/features"
                className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group"
              >
                {t("features")}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-primary/40 transition-all duration-300 group-hover:w-full" />
              </Link>
            </div>

            {/* Pricing link */}
            <Link
              href="/pricing"
              className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group"
            >
              {t("pricing")}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full bg-primary/40 transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Button
                size="sm"
                asChild
                className="rounded-full px-5 shadow-md shadow-primary/10 transition-all hover:shadow-lg hover:shadow-primary/15"
              >
                <Link href="/chat">
                  {t("goToApp")}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
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
              </>
            )}
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

      {/* Desktop Mega Menu */}
      <AnimatePresence>
        {megaMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:block bg-background/95 backdrop-blur-xl border-b border-border/30 shadow-2xl shadow-black/5"
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
          >
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="grid grid-cols-5 gap-6">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <Link
                      key={category.key}
                      href={category.href}
                      className="rounded-xl p-4 transition-all duration-200 hover:bg-muted/50 group/card"
                    >
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${category.color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: category.color }} />
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {t(`megaMenu.${category.key}.title`)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                        {t(`megaMenu.${category.key}.description`)}
                      </p>
                      <span
                        className="text-xs font-medium mt-3 inline-flex items-center gap-1"
                        style={{ color: category.color }}
                      >
                        {t(`megaMenu.${category.key}.explore`)}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  )
                })}
              </div>

              {/* Bottom link */}
              <div className="border-t border-border/30 mt-6 pt-4 text-center">
                <Link
                  href="/features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("megaMenu.allFeatures")}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {/* Features accordion */}
              <div>
                <button
                  onClick={() => setMobileAccordionOpen(!mobileAccordionOpen)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {t("features")}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      mobileAccordionOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {mobileAccordionOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1 pl-4 py-1">
                        {categories.map((category) => {
                          const Icon = category.icon
                          return (
                            <Link
                              key={category.key}
                              href={category.href}
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${category.color}15` }}
                              >
                                <Icon className="h-4 w-4" style={{ color: category.color }} />
                              </div>
                              <span className="font-medium">
                                {t(`megaMenu.${category.key}.title`)}
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pricing link */}
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t("pricing")}
              </Link>

              {/* CTA buttons */}
              <div className="mt-4 flex flex-col gap-2.5 border-t border-border/30 pt-5">
                {user ? (
                  <Button
                    size="sm"
                    asChild
                    className="w-full rounded-full shadow-md shadow-primary/10"
                  >
                    <Link href="/chat">
                      {t("goToApp")}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
