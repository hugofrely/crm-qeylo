"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import {
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Mail,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CTA } from "@/components/landing/cta"

const categoryConfig = {
  ai: {
    color: "#0D4F4F",
    gradient: "from-[#0D4F4F] to-[#083838]",
    icon: Sparkles,
    i18nKey: "featuresAI",
  },
  sales: {
    color: "#C9946E",
    gradient: "from-[#C9946E] to-[#8B6B4A]",
    icon: TrendingUp,
    i18nKey: "featuresSales",
  },
  contacts: {
    color: "#3D7A7A",
    gradient: "from-[#3D7A7A] to-[#2A5555]",
    icon: Users,
    i18nKey: "featuresContacts",
  },
  productivity: {
    color: "#8B5CF6",
    gradient: "from-[#8B5CF6] to-[#6D28D9]",
    icon: Zap,
    i18nKey: "featuresProductivity",
  },
  communication: {
    color: "#E5584A",
    gradient: "from-[#E5584A] to-[#B8342A]",
    icon: Mail,
    i18nKey: "featuresCommunication",
  },
} as const

const gradientClasses = {
  ai: "from-[#0D4F4F] to-[#083838]",
  sales: "from-[#C9946E] to-[#8B6B4A]",
  contacts: "from-[#3D7A7A] to-[#2A5555]",
  productivity: "from-[#8B5CF6] to-[#6D28D9]",
  communication: "from-[#E5584A] to-[#B8342A]",
} as const

// Sub-icons per feature index per category for visual variety
const featureSubIcons: Record<string, [LucideIcon, LucideIcon, LucideIcon]> = {
  ai: [Sparkles, Zap, TrendingUp],
  sales: [TrendingUp, Users, Sparkles],
  contacts: [Users, Zap, Mail],
  productivity: [Zap, Sparkles, TrendingUp],
  communication: [Mail, Users, Zap],
}

interface FeatureCategoryPageProps {
  category: "ai" | "sales" | "contacts" | "productivity" | "communication"
}

const animationProps = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
}

function FeatureIllustration({
  color,
  Icon,
}: {
  color: string
  Icon: LucideIcon
}) {
  return (
    <div
      className="relative rounded-2xl border border-border/30 overflow-hidden min-h-[280px] md:min-h-[360px] flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, ${color}03 50%, transparent 100%)`,
        boxShadow: `0 8px 32px -8px ${color}10`,
      }}
    >
      {/* Dot grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id={`feat-dots-${color.replace("#", "")}`}
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="16" cy="16" r="1" fill={color} />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`url(#feat-dots-${color.replace("#", "")})`}
          />
        </svg>
      </div>

      {/* Floating decorative circles */}
      <div
        className="absolute top-8 right-12 h-24 w-24 rounded-full border"
        style={{ borderColor: `${color}15` }}
      />
      <div
        className="absolute bottom-12 left-8 h-16 w-16 rounded-full border"
        style={{ borderColor: `${color}10` }}
      />
      <div
        className="absolute top-1/3 left-1/4 h-10 w-10 rounded-full"
        style={{ backgroundColor: `${color}06` }}
      />

      {/* Gradient accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(to right, transparent, ${color}20, transparent)`,
        }}
      />

      {/* Vertical accent line */}
      <div
        className="absolute top-0 right-16 w-px h-full"
        style={{
          background: `linear-gradient(to bottom, transparent, ${color}10, transparent)`,
        }}
      />

      {/* Center icon */}
      <Icon
        className="h-20 w-20"
        style={{ color, opacity: 0.08 }}
      />
    </div>
  )
}

export function FeatureCategoryPage({ category }: FeatureCategoryPageProps) {
  const config = categoryConfig[category]
  const t = useTranslations(`marketing.${config.i18nKey}`)
  const Icon = config.icon
  const color = config.color
  const subIcons = featureSubIcons[category]

  return (
    <>
      {/* ─── Section 1: Hero ─── */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          {/* Primary gradient orb */}
          <div
            className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full blur-[120px]"
            style={{ backgroundColor: color, opacity: 0.08 }}
          />
          {/* Secondary smaller orb */}
          <div
            className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full blur-[80px]"
            style={{ backgroundColor: color, opacity: 0.05 }}
          />
          {/* Dot grid overlay */}
          <div className="absolute inset-0 opacity-[0.02]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id={`hero-dots-${category}`}
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="20" cy="20" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={`url(#hero-dots-${category})`}
              />
            </svg>
          </div>
          {/* Large decorative category icon */}
          <Icon
            className="absolute -top-4 right-8 h-64 w-64 opacity-[0.03]"
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* Badge */}
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{
                backgroundColor: `${color}18`,
                color,
              }}
            >
              <Icon className="h-4 w-4" />
              {t("badge")}
            </span>

            {/* Title */}
            <h1 className="mt-6 text-4xl font-bold tracking-tight leading-[1.1] sm:text-5xl lg:text-6xl">
              {t("title")}{" "}
              <span
                className={`bg-gradient-to-r ${gradientClasses[category]} bg-clip-text text-transparent`}
              >
                {t("titleGradient")}
              </span>
            </h1>

            {/* Description */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              {t("description")}
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="group h-12 rounded-full px-8 text-base font-medium text-white shadow-xl transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 10px 30px -8px ${color}40`,
                }}
              >
                <Link href="/register">
                  {t("cta")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="h-12 rounded-full px-8 text-base border border-border/50"
              >
                <Link href="/features">{t("ctaSecondary")}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Section 2: Features (3 features, alternating layout) ─── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="space-y-0">
            {[0, 1, 2].map((featureIndex) => {
              const isOdd = featureIndex % 2 === 1
              const SubIcon = subIcons[featureIndex]
              const details = Array.from({ length: 4 }, (_, i) =>
                t(`features.${featureIndex}.details.${i}`)
              )

              return (
                <div key={featureIndex}>
                  <motion.div
                    {...animationProps}
                    transition={{ duration: 0.5, delay: featureIndex * 0.1 }}
                    className={`grid items-center gap-12 md:grid-cols-2 md:gap-20 ${
                      isOdd
                        ? "md:[direction:rtl] md:[&>*]:[direction:ltr]"
                        : ""
                    }`}
                  >
                    {/* Text side */}
                    <div>
                      <div
                        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${color}18` }}
                      >
                        <SubIcon
                          className="h-7 w-7"
                          style={{ color }}
                        />
                      </div>
                      <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
                        {t(`features.${featureIndex}.title`)}
                      </h2>
                      <p className="mt-4 leading-relaxed text-muted-foreground">
                        {t(`features.${featureIndex}.description`)}
                      </p>

                      {/* Separator */}
                      <div
                        className="mt-6 h-px w-16 rounded-full"
                        style={{ backgroundColor: `${color}4D` }}
                      />

                      {/* Detail bullet points */}
                      <ul className="mt-6 space-y-3">
                        {details.map((detail, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `${color}10` }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Illustration side */}
                    <FeatureIllustration color={color} Icon={SubIcon} />
                  </motion.div>

                  {/* Accent line separator between features */}
                  {featureIndex < 2 && (
                    <div
                      className="mx-auto my-16 h-px w-24"
                      style={{
                        background: `linear-gradient(to right, transparent, ${color}33, transparent)`,
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── Section 3: Stats Band ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0D1F1F] to-[#111110] py-16 lg:py-20">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id={`stats-dots-${category}`}
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="20" cy="20" r="1" fill="white" />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={`url(#stats-dots-${category})`}
              />
            </svg>
          </div>
          {/* Category color glow */}
          <div
            className="absolute -top-20 left-1/2 h-40 w-[400px] -translate-x-1/2 rounded-full blur-[100px]"
            style={{ backgroundColor: color, opacity: 0.05 }}
          />
        </div>

        <div className="relative">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 text-center sm:grid-cols-3 sm:gap-12">
            {[0, 1, 2].map((statIndex) => (
              <motion.div
                key={statIndex}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: statIndex * 0.15 }}
              >
                <div
                  className="text-4xl font-bold sm:text-5xl"
                  style={{ color }}
                >
                  {t(`stats.${statIndex}.value`)}
                </div>
                <div className="mt-2 text-sm uppercase tracking-wider text-white/60">
                  {t(`stats.${statIndex}.label`)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 4: CTA ─── */}
      <CTA />
    </>
  )
}
