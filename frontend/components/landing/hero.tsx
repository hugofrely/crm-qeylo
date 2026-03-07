"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChatIllustration } from "./illustrations"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-24 lg:pt-36 lg:pb-32">
      {/* Layered background with depth */}
      <div className="pointer-events-none absolute inset-0">
        {/* Large rotating gradient orb */}
        <div className="absolute -top-60 -right-60 h-[800px] w-[800px] animate-rotate-slow opacity-[0.04]">
          <div className="h-full w-full rounded-full" style={{ background: 'conic-gradient(from 0deg, #0D4F4F, #C9946E, #3D7A7A, #0D4F4F)' }} />
        </div>
        {/* Warm accent blob */}
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-warm opacity-[0.05] blur-[120px] animate-scale-pulse" />
        {/* Center teal wash */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[900px] rounded-full bg-teal-light opacity-40 blur-[100px]" />
        {/* Dot grid overlay for texture */}
        <div className="absolute inset-0 dot-grid opacity-[0.03]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          {/* Left column — text with dramatic hierarchy */}
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/10 bg-white/60 backdrop-blur-sm px-5 py-2 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                  CRM conversationnel IA
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            >
              <span className="block">Dis-le.</span>
              <span className="relative mt-1 block">
                <span className="bg-gradient-to-r from-primary via-teal to-warm bg-clip-text text-transparent">
                  C&apos;est fait.
                </span>
                {/* Accent underline with shimmer */}
                <span className="absolute -bottom-2 left-0 w-full accent-line rounded-full" />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-8 text-lg leading-relaxed text-muted-foreground max-w-lg"
            >
              Le CRM qui comprend ce que vous dites. Contacts, deals, taches,
              automations, rapports — Qeylo gere tout depuis une simple
              conversation.{" "}
              <span className="font-semibold text-foreground">
                Simple, rapide, sans friction.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Button
                size="lg"
                asChild
                className="group h-13 rounded-full px-8 text-base font-medium shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/25 hover:scale-[1.02]"
              >
                <Link href="/register">
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="h-13 rounded-full px-7 text-base border border-border/60 hover:border-primary/20 hover:bg-teal-light/30"
              >
                <Link href="/features">Voir les fonctionnalites</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-12 flex items-center gap-8 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Gratuit pour commencer
              </span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
                Aucune carte requise
              </span>
            </motion.div>
          </div>

          {/* Right column — illustration with real volume */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40, rotateY: -5 }}
            animate={{ opacity: 1, scale: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
            style={{ perspective: "1200px" }}
          >
            <div className="relative mx-auto max-w-md lg:max-w-none" style={{ transformStyle: "preserve-3d" }}>
              {/* Deep shadow layer — far offset for elevation */}
              <div className="absolute inset-0 translate-y-8 rounded-[2rem] bg-primary/[0.04] blur-[40px]" />
              {/* Medium shadow layer */}
              <div className="absolute inset-0 translate-y-4 rounded-[2rem] bg-primary/[0.06] blur-[20px]" />
              {/* Color glow behind */}
              <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-teal/[0.06] via-transparent to-warm/[0.06] blur-2xl" />

              {/* The card itself — elevated with inner light */}
              <div
                className="relative rounded-[1.5rem] p-2 overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))",
                  boxShadow: "0 25px 60px -12px rgba(13,79,79,0.12), 0 4px 20px -4px rgba(0,0,0,0.06), inset 0 1px 0 0 rgba(255,255,255,0.8), inset 0 -1px 0 0 rgba(0,0,0,0.03)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <ChatIllustration className="relative w-full" />
              </div>
            </div>

            {/* Floating 3D accent elements */}
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 h-24 w-24 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(201,148,110,0.15), transparent 70%)",
                boxShadow: "0 8px 30px -10px rgba(201,148,110,0.2)",
              }}
            />
            <motion.div
              animate={{ y: [6, -6, 6] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(13,79,79,0.12), transparent 70%)",
                boxShadow: "0 8px 25px -8px rgba(13,79,79,0.15)",
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
