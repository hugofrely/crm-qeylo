"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatIllustration } from "./illustrations"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#F97316] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-20 -left-40 h-[400px] w-[400px] rounded-full bg-[#3B82F6] opacity-[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column — text */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F97316]/20 bg-[#F97316]/5 px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#F97316]" />
                <span className="text-xs font-medium text-[#F97316]">
                  CRM conversationnel propulsé par l&apos;IA
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
            >
              Dis-le.
              <br />
              <span className="bg-gradient-to-r from-[#F97316] to-[#FB923C] bg-clip-text text-transparent">
                C&apos;est fait.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg leading-relaxed text-muted-foreground"
            >
              Le CRM qui comprend ce que vous dites. Parlez naturellement,
              Qeylo crée vos contacts, gère vos deals et organise vos tâches.
              Zéro formulaire. Zéro friction.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Button
                size="lg"
                asChild
                className="h-12 rounded-full bg-[#F97316] px-7 text-base font-medium text-white hover:bg-[#EA580C] shadow-lg shadow-[#F97316]/20"
              >
                <Link href="/register">
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="h-12 rounded-full px-7 text-base"
              >
                <Link href="/features">Voir les fonctionnalités</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-10 flex items-center gap-6 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Gratuit pour commencer
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Aucune carte requise
              </span>
            </motion.div>
          </div>

          {/* Right column — illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Glow behind illustration */}
              <div className="absolute inset-0 -m-8 rounded-3xl bg-gradient-to-br from-[#F97316]/10 via-transparent to-[#3B82F6]/5 blur-2xl" />
              <ChatIllustration className="relative w-full drop-shadow-sm" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
