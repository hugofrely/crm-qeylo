"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import { Check, ArrowRight, HelpCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

const planKeys = ["solo", "pro", "equipe"] as const

const planConfigs = {
  solo: { price: "0", href: "/register" as const, highlight: false, accent: "#3D7A7A", featureCount: 7 },
  pro: { price: "19", href: "/register" as const, highlight: true, accent: "#0D4F4F", featureCount: 12 },
  equipe: { price: "49", href: "/register" as const, highlight: false, accent: "#C9946E", featureCount: 8 },
}

interface ComparisonFeature {
  key: string
  solo: boolean | string
  pro: boolean | string
  equipe: boolean | string
}

interface ComparisonCategory {
  categoryKey: string
  features: ComparisonFeature[]
}

const comparisonData: ComparisonCategory[] = [
  {
    categoryKey: "general",
    features: [
      { key: "users", solo: "value", pro: "value", equipe: "value" },
      { key: "contacts", solo: "value", pro: "value", equipe: "value" },
    ],
  },
  {
    categoryKey: "crm",
    features: [
      { key: "pipelines", solo: "value", pro: "value", equipe: "value" },
      { key: "customStages", solo: false, pro: true, equipe: true },
      { key: "deals", solo: "value", pro: "value", equipe: "value" },
      { key: "segments", solo: false, pro: true, equipe: true },
      { key: "products", solo: false, pro: true, equipe: true },
      { key: "duplicates", solo: false, pro: true, equipe: true },
    ],
  },
  {
    categoryKey: "productivity",
    features: [
      { key: "tasks", solo: true, pro: true, equipe: true },
      { key: "calendar", solo: true, pro: true, equipe: true },
      { key: "teamAssignment", solo: false, pro: false, equipe: true },
      { key: "workflows", solo: false, pro: true, equipe: true },
      { key: "emailTemplates", solo: false, pro: true, equipe: true },
    ],
  },
  {
    categoryKey: "ai",
    features: [
      { key: "chatAi", solo: "value", pro: "value", equipe: "value" },
    ],
  },
  {
    categoryKey: "analytics",
    features: [
      { key: "dashboard", solo: "value", pro: "value", equipe: "value" },
      { key: "customReports", solo: false, pro: true, equipe: true },
      { key: "conversionFunnel", solo: false, pro: true, equipe: true },
    ],
  },
  {
    categoryKey: "integrations",
    features: [
      { key: "emailIntegration", solo: false, pro: true, equipe: true },
      { key: "csvImportExport", solo: false, pro: true, equipe: true },
      { key: "apiAccess", solo: false, pro: false, equipe: true },
    ],
  },
  {
    categoryKey: "support",
    features: [
      { key: "email", solo: true, pro: true, equipe: true },
      { key: "prioritySupport", solo: false, pro: true, equipe: true },
      { key: "dedicatedOnboarding", solo: false, pro: false, equipe: true },
    ],
  },
]

const FAQ_COUNT = 7

export default function PricingPageClient() {
  const t = useTranslations("marketing.pricingPage")

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Header with depth */}
        <section className="relative pt-32 pb-16 lg:pt-40 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-teal-light opacity-25 blur-[100px]" />
            <div className="absolute inset-0 dot-grid opacity-[0.02]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                {t("label")}
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                {t("title")}
              </h1>
              <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
                {t("descriptionLine1")}
                <br />
                {t("descriptionLine2")}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pb-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-6 md:grid-cols-3 items-start">
              {planKeys.map((key, index) => {
                const plan = planConfigs[key]
                const features = Array.from({ length: plan.featureCount }, (_, i) =>
                  t(`plans.${key}.features.${i}`)
                )
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: index * 0.1 }}
                    className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-500 ${
                      plan.highlight
                        ? "border-primary/20 bg-card shadow-2xl shadow-primary/[0.06] scale-[1.03] z-10"
                        : "border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/[0.03]"
                    }`}
                  >
                    {/* Gradient top bar */}
                    <div
                      className="h-1 w-full"
                      style={{
                        background: `linear-gradient(90deg, ${plan.accent}, ${plan.accent}60)`,
                      }}
                    />

                    {plan.highlight && (
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-3 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                        {t("popular")}
                      </div>
                    )}

                    <div className={`p-8 ${plan.highlight ? "pt-10" : ""}`}>
                      <div>
                        <h3 className="text-lg font-semibold">{t(`plans.${key}.name`)}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t(`plans.${key}.description`)}
                        </p>
                        <div className="mt-6 flex items-baseline gap-1">
                          <span className="text-5xl font-bold tracking-tight">
                            {plan.price}&euro;
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">
                            {t(`plans.${key}.period`)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-8 h-px bg-gradient-to-r from-border via-border to-transparent" />

                      <ul className="mt-8 flex-1 space-y-3.5">
                        {features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-3 text-sm"
                          >
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5" style={{ backgroundColor: plan.accent + '10' }}>
                              <Check className="h-3 w-3" style={{ color: plan.accent }} />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-10">
                        <Button
                          asChild
                          className={`w-full rounded-full h-12 text-sm font-medium transition-all ${
                            plan.highlight
                              ? "shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.01]"
                              : ""
                          }`}
                          variant={plan.highlight ? "default" : "outline"}
                        >
                          <Link href={plan.href}>
                            {t(`plans.${key}.cta`)}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Comparison grid */}
        <section className="pb-28">
          <div className="mx-auto max-w-6xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-14"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("comparison.title")}
              </h2>
              <p className="mt-4 text-muted-foreground">
                {t("comparison.description")}
              </p>
            </motion.div>

            <div className="overflow-x-auto rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="py-5 pl-6 pr-4 text-left text-sm font-medium text-muted-foreground w-[40%]">
                      {t("comparison.featureCol")}
                    </th>
                    <th className="py-5 px-4 text-center text-sm font-semibold w-[20%]">Solo</th>
                    <th className="py-5 px-4 text-center text-sm font-semibold text-primary w-[20%]">Pro</th>
                    <th className="py-5 px-4 text-center text-sm font-semibold w-[20%]">{t("plans.equipe.name")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((group) => (
                    <React.Fragment key={group.categoryKey}>
                      <tr>
                        <td
                          colSpan={4}
                          className="pt-8 pb-3 pl-6 text-xs font-bold uppercase tracking-[0.15em] text-primary"
                        >
                          {t(`comparison.categories.${group.categoryKey}.label`)}
                        </td>
                      </tr>
                      {group.features.map((feature) => (
                        <tr key={feature.key} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 pl-6 pr-4 text-sm">
                            {t(`comparison.categories.${group.categoryKey}.features.${feature.key}.name`)}
                          </td>
                          {(["solo", "pro", "equipe"] as const).map((planKey) => {
                            const value = feature[planKey]
                            return (
                              <td key={planKey} className="py-3.5 px-4 text-center">
                                {value === true ? (
                                  <Check className="mx-auto h-4 w-4 text-primary" />
                                ) : value === false ? (
                                  <X className="mx-auto h-4 w-4 text-muted-foreground/50" />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {t(`comparison.categories.${group.categoryKey}.features.${feature.key}.${planKey}`)}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative border-t border-border/30 py-28 overflow-hidden grain">
          <div className="absolute inset-0 bg-muted/30" />
          <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

          <div className="relative mx-auto max-w-3xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("faq.title")}
              </h2>
            </motion.div>

            <div className="mt-14 space-y-4">
              {Array.from({ length: FAQ_COUNT }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/15 hover:shadow-lg hover:shadow-primary/[0.03]"
                >
                  <h3 className="flex items-center gap-3 font-semibold">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.06]">
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    {t(`faq.items.${index}.question`)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground pl-10">
                    {t(`faq.items.${index}.answer`)}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <p className="text-muted-foreground">
                {t("faq.contactQuestion")}{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  {t("faq.contactUs")}
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
