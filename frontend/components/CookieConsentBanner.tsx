"use client"

import { useState, useEffect } from "react"
import posthog from "posthog-js"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

const CONSENT_KEY = "ph_cookie_consent"

function getStoredConsent(): "granted" | "denied" | null {
  if (typeof window === "undefined") return null
  const value = localStorage.getItem(CONSENT_KEY)
  if (value === "granted" || value === "denied") return value
  return null
}

export function CookieConsentBanner() {
  const t = useTranslations("notifications.cookies")
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getStoredConsent()
    if (consent === null) {
      setVisible(true)
    } else if (consent === "granted") {
      posthog.opt_in_capturing()
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, "granted")
    posthog.opt_in_capturing()
    setVisible(false)
  }

  function refuse() {
    localStorage.setItem(CONSENT_KEY, "denied")
    posthog.opt_out_capturing()
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-[100] p-4"
        >
          <div className="mx-auto max-w-2xl flex items-center justify-between gap-4 rounded-xl border bg-background/80 backdrop-blur-lg px-5 py-3 shadow-lg">
            <p className="text-sm text-muted-foreground">
              {t("message")}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={refuse}>
                {t("refuse")}
              </Button>
              <Button size="sm" onClick={accept}>
                {t("accept")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
