"use client"

import { useTranslations } from "next-intl"
import { motion } from "motion/react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function MentionsLegales() {
  const t = useTranslations("marketing.mentionsLegales")

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {t("label")}
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {t("subtitle")}
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-primary/20 via-border to-transparent" />
          </motion.div>

          {/* Sections */}
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section1.title")}
              </h2>
              <div className="space-y-1 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section1.companyName")}</p>
                <p>{t("section1.legalForm")}</p>
                <p>{t("section1.address")}</p>
                <p>{t("section1.siret")}</p>
                <p>{t("section1.capital")}</p>
                <p>{t("section1.representative")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section2.title")}
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">{t("section2.name")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">{t("section3.title")}</h2>
              <div className="space-y-1 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section3.host")}</p>
                <p>{t("section3.address")}</p>
                <p>
                  {t("section3.siteLabel")}{" "}
                  <a
                    href="https://www.digitalocean.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    www.digitalocean.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">{t("section4.title")}</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {t("section4.emailLabel")}{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                >
                  hello@qeylo.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section5.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section5.p1")}</p>
                <p>{t("section5.p2")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section6.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section6.p1")}</p>
                <p>{t("section6.p2")}</p>
                <p>{t("section6.p3")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section7.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section7.p1")}</p>
                <p>{t("section7.p2")}</p>
              </div>
            </section>
          </div>

          <p className="mt-16 text-xs text-muted-foreground">
            {t("lastUpdated")}
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
