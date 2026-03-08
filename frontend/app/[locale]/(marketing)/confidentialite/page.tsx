"use client"

import { useTranslations } from "next-intl"
import { motion } from "motion/react"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"

export default function PolitiqueConfidentialite() {
  const t = useTranslations("marketing.confidentialite")

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
                <p>{t("section1.company")}</p>
                <p>{t("section1.address")}</p>
                <p>
                  {t("section1.emailLabel")}{" "}
                  <a
                    href="mailto:hello@qeylo.com"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    hello@qeylo.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section2.title")}
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>
                    <strong>{t(`section2.items.${i}.label`)}</strong>{" "}
                    {t(`section2.items.${i}.text`)}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section3.title")}
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>{t(`section3.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section4.title")}
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2].map((i) => (
                  <li key={i}>
                    <strong>{t(`section4.items.${i}.label`)}</strong>{" "}
                    {t(`section4.items.${i}.text`)}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section5.title")}
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2].map((i) => (
                  <li key={i}>
                    <strong>{t(`section5.items.${i}.label`)}</strong>{" "}
                    {t(`section5.items.${i}.text`)}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section6.title")}
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2].map((i) => (
                  <li key={i}>{t(`section6.items.${i}`)}</li>
                ))}
              </ul>
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

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section8.title")}
              </h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <li key={i}>
                    <strong>{t(`section8.items.${i}.label`)}</strong>{" "}
                    {t(`section8.items.${i}.text`)}
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 text-sm text-foreground/80 leading-relaxed">
                <p>
                  {t("section8.exerciseRights")}{" "}
                  <a
                    href="mailto:hello@qeylo.com"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    hello@qeylo.com
                  </a>
                </p>
                <p>
                  {t("section8.cnilText")}{" "}
                  <a
                    href="https://www.cnil.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    CNIL
                  </a>
                  .
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">{t("section9.title")}</h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section9.p1")}</p>
                <p>{t("section9.p2")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">{t("section10.title")}</h2>
              <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>{t(`section10.items.${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">
                {t("section11.title")}
              </h2>
              <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
                <p>{t("section11.p1")}</p>
                <p>{t("section11.p2")}</p>
                <p>{t("section11.p3")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">{t("section12.title")}</h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {t("section12.text")}{" "}
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
