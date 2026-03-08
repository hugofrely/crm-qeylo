"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import { Sparkles, TrendingUp, Users, Zap, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { CTA } from "@/components/landing/cta"

const categories = [
  { key: "ai", href: "/features/ai" as const, icon: Sparkles, color: "#0D4F4F", featured: true },
  { key: "sales", href: "/features/sales" as const, icon: TrendingUp, color: "#C9946E", featured: false },
  { key: "contacts", href: "/features/contacts" as const, icon: Users, color: "#3D7A7A", featured: false },
  { key: "productivity", href: "/features/productivity" as const, icon: Zap, color: "#8B5CF6", featured: false },
  { key: "communication", href: "/features/communication" as const, icon: Mail, color: "#E5584A", featured: false },
]

export default function FeaturesPage() {
  const t = useTranslations("marketing.featuresPage")
  const tNav = useTranslations("marketing.navbar")

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero section */}
        <section className="relative pt-32 pb-16 lg:pt-40 overflow-hidden">
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-teal-light opacity-30 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-warm-light opacity-30 blur-[80px]" />
            <div className="absolute inset-0 dot-grid opacity-[0.02]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                {t("label")}
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                {t("titleLine1")}
                <br />
                <span className="bg-gradient-to-r from-primary via-teal to-warm bg-clip-text text-transparent">
                  {t("titleLine2")}
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                {t("description")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Category grid */}
        <section className="pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => {
                const Icon = category.icon
                const isFeatured = category.featured

                return (
                  <motion.div
                    key={category.key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className={`group relative overflow-hidden rounded-2xl border border-border/50 transition-all duration-500 hover:-translate-y-1 ${
                      isFeatured ? "sm:col-span-2 lg:col-span-2" : ""
                    }`}
                    style={{
                      background: "linear-gradient(170deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
                      boxShadow: "0 4px 20px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 0 rgba(255,255,255,0.7)",
                    }}
                    whileHover={{
                      borderColor: `${category.color}33`,
                      boxShadow: `0 20px 50px -12px ${category.color}1A, 0 4px 20px -4px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.8)`,
                    }}
                  >
                    {/* Top gradient accent bar */}
                    <div
                      className="h-1 w-full"
                      style={{
                        background: `linear-gradient(to right, ${category.color}, transparent)`,
                      }}
                    />

                    <div className="p-8 flex flex-col h-full">
                      {/* Icon */}
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${category.color}1A` }}
                      >
                        <Icon
                          className="h-7 w-7"
                          style={{ color: category.color }}
                        />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mt-5">
                        {tNav(`megaMenu.${category.key}.title`)}
                      </h3>

                      {/* Description */}
                      <p className="mt-3 text-muted-foreground leading-relaxed">
                        {tNav(`megaMenu.${category.key}.description`)}
                      </p>

                      {/* CTA button */}
                      <div className="mt-auto pt-6">
                        <Button
                          asChild
                          className="w-full rounded-full text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <Link href={category.href} className="inline-flex items-center justify-center gap-2">
                            {tNav(`megaMenu.${category.key}.explore`)}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Corner accent blob */}
                    <div
                      className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.08]"
                      style={{ backgroundColor: category.color }}
                    />
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
