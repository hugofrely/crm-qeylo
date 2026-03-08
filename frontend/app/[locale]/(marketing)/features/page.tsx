"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import {
  ArrowRight,
  MessageSquare,
  Users,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  Workflow,
  FileSpreadsheet,
  Inbox,
  Building2,
  Package,
  Search,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { CTA } from "@/components/landing/cta"
import { FeaturePageIllustration } from "@/components/landing/illustrations"

const mainFeatureConfigs = [
  { icon: MessageSquare, color: "#0D4F4F", illustration: "chat" as const, detailCount: 4 },
  { icon: Users, color: "#3D7A7A", illustration: "contacts" as const, detailCount: 5 },
  { icon: KanbanSquare, color: "#C9946E", illustration: "pipeline" as const, detailCount: 4 },
  { icon: CheckSquare, color: "#0D4F4F", illustration: "tasks" as const, detailCount: 5 },
  { icon: Workflow, color: "#3D7A7A", illustration: "ai" as const, detailCount: 4 },
  { icon: BarChart3, color: "#C9946E", illustration: "dashboard" as const, detailCount: 4 },
]

const extraFeatureIcons = [FileSpreadsheet, Inbox, Building2, Package, Search, Copy]

export default function FeaturesPage() {
  const t = useTranslations("marketing.featuresPage")

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Header with depth */}
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

        {/* Main features — alternating layout with depth */}
        <section className="pb-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="space-y-32">
              {mainFeatureConfigs.map((feature, index) => {
                const Icon = feature.icon
                const isReversed = index % 2 === 1
                const title = t(`mainFeatures.${index}.title`)
                const description = t(`mainFeatures.${index}.description`)
                const details = Array.from({ length: feature.detailCount }, (_, i) =>
                  t(`mainFeatures.${index}.details.${i}`)
                )
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6 }}
                    className={`grid items-center gap-12 md:grid-cols-2 md:gap-20 ${
                      isReversed
                        ? "md:[direction:rtl] md:[&>*]:[direction:ltr]"
                        : ""
                    }`}
                  >
                    <div>
                      <div
                        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${feature.color}12` }}
                      >
                        <Icon
                          className="h-7 w-7"
                          style={{ color: feature.color }}
                        />
                      </div>
                      <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
                        {title}
                      </h2>
                      <p className="mt-4 leading-relaxed text-muted-foreground">
                        {description}
                      </p>

                      {/* Separator */}
                      <div className="mt-6 h-px w-16 rounded-full" style={{ backgroundColor: `${feature.color}30` }} />

                      <ul className="mt-6 space-y-3">
                        {details.map((detail) => (
                          <li
                            key={detail}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{
                                backgroundColor: `${feature.color}10`,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: feature.color }}
                              />
                            </span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Illustration with depth frame */}
                    <div className="relative">
                      <div className="absolute inset-0 -m-4 rounded-[2rem] opacity-40 blur-2xl" style={{ backgroundColor: `${feature.color}08` }} />
                      <div className="relative overflow-hidden rounded-2xl border border-border/30 shadow-xl shadow-primary/[0.03]">
                        <FeaturePageIllustration variant={feature.illustration} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Extra features strip */}
        <section className="relative border-t border-border/30 py-20 overflow-hidden grain">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {extraFeatureIcons.map((Icon, index) => {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                    className="group text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.06] transition-all duration-300 group-hover:bg-primary/10 group-hover:shadow-lg group-hover:shadow-primary/[0.05]">
                      <Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <h3 className="mt-5 font-semibold">{t(`extraFeatures.${index}.title`)}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t(`extraFeatures.${index}.description`)}
                    </p>
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
