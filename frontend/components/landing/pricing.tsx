"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import { Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const planKeys = ["solo", "pro", "equipe"] as const

const planConfigs = {
  solo: { price: "0", href: "/register" as const, highlight: false, accent: "#3D7A7A", featureCount: 7 },
  pro: { price: "19", href: "/register" as const, highlight: true, accent: "#0D4F4F", featureCount: 10 },
  equipe: { price: "49", href: "/register" as const, highlight: false, accent: "#C9946E", featureCount: 8 },
}

export function Pricing() {
  const t = useTranslations("marketing.pricing")

  return (
    <section className="relative py-28 lg:py-36 grain" id="pricing">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-teal-light opacity-20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {t("label")}
          </span>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl leading-[1.1]">
            {t("titleLine1")}
            <br />
            <span className="text-muted-foreground">{t("titleLine2")}</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            {t("description")}
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-3 items-start">
          {planKeys.map((key, index) => {
            const plan = planConfigs[key]
            const features = Array.from({ length: plan.featureCount }, (_, i) =>
              t(`plans.${key}.features.${i}`)
            )
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                className={`group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-500 ${
                  plan.highlight
                    ? "border-primary/15 scale-[1.03] z-10"
                    : "border-border/50 hover:-translate-y-1"
                }`}
                style={
                  plan.highlight
                    ? {
                        background: "linear-gradient(170deg, rgba(255,255,255,0.95), rgba(232,244,244,0.6))",
                        boxShadow: "0 30px 70px -15px rgba(13,79,79,0.15), 0 8px 30px -8px rgba(0,0,0,0.08), inset 0 1px 0 0 rgba(255,255,255,0.9), inset 0 -1px 0 0 rgba(13,79,79,0.03)",
                      }
                    : {
                        background: "linear-gradient(170deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))",
                        boxShadow: "0 4px 20px -4px rgba(0,0,0,0.05), inset 0 1px 0 0 rgba(255,255,255,0.7)",
                      }
                }
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
                      <li key={feature} className="flex items-start gap-3 text-sm">
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
  )
}
