"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { motion } from "motion/react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function CGU() {
  const t = useTranslations("marketing.cgu")

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
                {t("article1.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("article1.p1")}</p>
                <p>{t("article1.p2")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article2.title")}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                <li>{t("article2.items.0")}</li>
                <li>{t("article2.items.1")}</li>
                <li>{t("article2.items.2")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article3.title")}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>{t(`article3.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article4.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("article4.intro")}</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i}>{t(`article4.plans.${i}`)}</li>
                  ))}
                </ul>
                <p>{t("article4.outro")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article5.title")}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                {[0, 1, 2, 3, 4].map((i) => (
                  <li key={i}>{t(`article5.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article6.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("article6.p1")}</p>
                <p>{t("article6.p2")}</p>
                <p>{t("article6.p3")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article7.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>
                  {t("article7.p1")}{" "}
                  <Link
                    href="/confidentialite"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    {t("article7.linkText")}
                  </Link>
                  .
                </p>
                <p>{t("article7.p2")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article8.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("article8.p1")}</p>
                <p>{t("article8.p2")}</p>
                <p>{t("article8.p3")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article9.title")}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>{t(`article9.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article10.title")}
              </h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80 leading-relaxed">
                {[0, 1, 2].map((i) => (
                  <li key={i}>{t(`article10.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article11.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("article11.p1")}</p>
                <p>{t("article11.p2")}</p>
                <p>{t("article11.p3")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article12.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("article12.p1")}</p>
                <p>{t("article12.p2")}</p>
                <p>{t("article12.p3")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("article13.title")}
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {t("article13.text")}{" "}
                <a
                  href="mailto:hello@qeylo.com"
                  className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                >
                  hello@qeylo.com
                </a>
              </p>
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
