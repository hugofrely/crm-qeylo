"use client"

import { useTranslations } from "next-intl"
import { motion } from "motion/react"
import { HowItWorksIllustration } from "./illustrations"

const steps = [
  { step: 1 as const, number: "01", accent: "#0D4F4F" },
  { step: 2 as const, number: "02", accent: "#C9946E" },
  { step: 3 as const, number: "03", accent: "#3D7A7A" },
]

export function HowItWorks() {
  const t = useTranslations("marketing.howItWorks")

  return (
    <section className="relative py-28 lg:py-36 overflow-hidden grain">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute top-0 left-0 right-0 h-[3px] accent-line" />

      {/* Decorative large step numbers background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none hidden lg:block">
        <span className="absolute -left-10 top-1/4 text-[16rem] font-bold leading-none text-primary/[0.015]">01</span>
        <span className="absolute left-1/3 top-1/3 text-[16rem] font-bold leading-none text-warm/[0.015]">02</span>
        <span className="absolute right-0 top-1/2 text-[16rem] font-bold leading-none text-primary/[0.015]">03</span>
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
        </motion.div>

        <div className="mt-20 grid gap-8 md:grid-cols-3 md:gap-6 relative">
          {/* Connection line on desktop */}
          <div className="hidden md:block absolute top-[120px] left-[calc(16.67%+30px)] right-[calc(16.67%+30px)] h-[2px]">
            <div className="h-full bg-gradient-to-r from-primary/20 via-warm/20 to-primary/20 rounded-full" />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center group"
            >
              {/* Step number with accent ring */}
              <div className="relative mx-auto mb-6 w-fit">
                <div
                  className="absolute inset-0 -m-3 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-30"
                  style={{ backgroundColor: step.accent }}
                />
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 mx-auto"
                  style={{
                    borderColor: step.accent + '25',
                    background: "linear-gradient(170deg, #FFFFFF, #F5F5F2)",
                    boxShadow: `0 10px 30px -8px ${step.accent}20, 0 4px 12px -4px rgba(0,0,0,0.06), inset 0 1px 0 0 rgba(255,255,255,0.9)`,
                  }}
                >
                  <span className="text-lg font-bold" style={{ color: step.accent }}>{step.number}</span>
                </div>
              </div>

              <div className="mx-auto w-fit mb-6">
                <HowItWorksIllustration step={step.step} />
              </div>

              <div>
                <h3 className="text-xl font-semibold">{t(`steps.${index}.title`)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-xs mx-auto">
                  {t(`steps.${index}.description`)}
                </p>
              </div>

              {/* Bottom accent dot */}
              <div
                className="mx-auto mt-6 h-2 w-2 rounded-full opacity-30"
                style={{ backgroundColor: step.accent }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
