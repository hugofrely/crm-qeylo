"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="noise-overlay relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16 lg:py-24"
          style={{ background: 'linear-gradient(145deg, #0D4F4F 0%, #0D1F1F 100%)' }}
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-[#3DD9D9] opacity-10 blur-[100px]" />
            <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-[#C9946E] opacity-10 blur-[60px]" />
          </div>

          {/* Geometric grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cta-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cta-grid)" />
            </svg>
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Prêt à simplifier
              <br />
              votre relation client ?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
              Rejoignez les freelances qui gagnent du temps chaque jour avec un
              CRM qui les comprend vraiment.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="h-12 rounded-full bg-[#3DD9D9] px-8 text-base font-medium text-[#0D1F1F] hover:bg-[#2BC0C0] shadow-lg shadow-[#3DD9D9]/20"
              >
                <Link href="/register">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="h-12 rounded-full px-8 text-base text-white/70 hover:text-white hover:bg-white/10"
              >
                <Link href="/features">En savoir plus</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
