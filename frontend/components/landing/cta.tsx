"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import { ArrowRight, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  const t = useTranslations("marketing.cta")

  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="noise-overlay grain relative overflow-hidden rounded-[2rem] px-8 py-20 sm:px-16 lg:py-28"
          style={{
            background: 'linear-gradient(145deg, #0D4F4F 0%, #083838 50%, #0D1F1F 100%)',
            boxShadow: '0 40px 80px -20px rgba(13,79,79,0.25), 0 8px 30px -8px rgba(0,0,0,0.15), inset 0 1px 0 0 rgba(255,255,255,0.04), inset 0 -1px 0 0 rgba(0,0,0,0.2)',
          }}
        >
          {/* Layered background effects */}
          <div className="pointer-events-none absolute inset-0">
            {/* Primary glow */}
            <div className="absolute -top-40 left-1/2 h-80 w-[500px] -translate-x-1/2 rounded-full bg-[#3DD9D9] opacity-[0.08] blur-[120px]" />
            {/* Warm accent */}
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-[#C9946E] opacity-[0.08] blur-[80px]" />
            {/* Left accent */}
            <div className="absolute top-1/2 -left-20 h-40 w-40 rounded-full bg-[#3DD9D9] opacity-[0.05] blur-[60px]" />
          </div>

          {/* Geometric pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cta-grid-v2" width="80" height="80" patternUnits="userSpaceOnUse">
                  <circle cx="40" cy="40" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-grid-v2)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Floating icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] backdrop-blur-sm border border-white/[0.08]"
            >
              <MessageSquare className="h-7 w-7 text-[#3DD9D9]" />
            </motion.div>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.1]">
              {t("title")}
              <br />
              <span className="bg-gradient-to-r from-[#3DD9D9] to-[#C9946E] bg-clip-text text-transparent">
                {t("titleGradient")}
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/80 leading-relaxed">
              {t("description")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="group h-13 rounded-full bg-[#3DD9D9] px-8 text-base font-medium text-[#0D1F1F] hover:bg-[#2BC0C0] shadow-xl shadow-[#3DD9D9]/20 transition-all hover:shadow-2xl hover:shadow-[#3DD9D9]/30 hover:scale-[1.02]"
              >
                <Link href="/register">
                  {t("startFree")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="h-13 rounded-full px-8 text-base text-white/85 hover:text-white hover:bg-white/10 border border-white/10"
              >
                <Link href="/features">{t("learnMore")}</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
