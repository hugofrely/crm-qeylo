"use client"

import { useAuth } from "@/lib/auth"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { AIDemo } from "@/components/landing/ai-demo"
import { FeaturesShowcase } from "@/components/landing/features-showcase"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Pricing } from "@/components/landing/pricing"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"
import { useTranslations } from "next-intl"

export default function HomePage() {
  const { loading } = useAuth()
  const t = useTranslations("common")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AIDemo />
        <FeaturesShowcase />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
