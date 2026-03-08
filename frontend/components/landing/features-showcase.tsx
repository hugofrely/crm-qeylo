"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import { Sparkles, TrendingUp, Users, Zap, Mail, ArrowRight } from "lucide-react"

const showcaseCategories = [
  { key: "ai", href: "/features/ai" as const, icon: Sparkles, color: "#0D4F4F", featured: true },
  { key: "sales", href: "/features/sales" as const, icon: TrendingUp, color: "#C9946E", featured: false },
  { key: "contacts", href: "/features/contacts" as const, icon: Users, color: "#3D7A7A", featured: false },
  { key: "productivity", href: "/features/productivity" as const, icon: Zap, color: "#8B5CF6", featured: false },
  { key: "communication", href: "/features/communication" as const, icon: Mail, color: "#E5584A", featured: false },
]

export function FeaturesShowcase() {
  const t = useTranslations("marketing.features")

  return (
    <section className="relative py-28 lg:py-36 grain" id="features">
      <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {t("showcase.label")}
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl leading-[1.1]">
            {t("showcase.title")}
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">
            {t("showcase.description")}
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showcaseCategories.map((category, index) => {
            const Icon = category.icon
            const isFeatured = category.featured

            return (
              <motion.div
                key={category.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
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

                <div className={isFeatured ? "p-8" : "p-6"}>
                  {/* Icon */}
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${category.color}1A` }}
                  >
                    <Icon
                      className="h-6 w-6"
                      style={{ color: category.color }}
                    />
                  </div>

                  {/* Title */}
                  <h3 className={`font-semibold mt-4 ${isFeatured ? "text-xl" : "text-lg"}`}>
                    {t(`showcase.categories.${category.key}.title`)}
                  </h3>

                  {/* Bullet points */}
                  <ul className="mt-3 space-y-2">
                    {[0, 1, 2].map((pointIndex) => (
                      <li key={pointIndex} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {t(`showcase.categories.${category.key}.points.${pointIndex}`)}
                      </li>
                    ))}
                  </ul>

                  {/* Discover link */}
                  <Link
                    href={category.href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: category.color }}
                  >
                    {t("showcase.explore")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Corner accent blob */}
                <div
                  className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.08]"
                  style={{ backgroundColor: category.color }}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
