"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence, useInView } from "motion/react"
import {
  Phone,
  Users,
  Handshake,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ListChecks,
  StickyNote,
  ArrowRightCircle,
  PhoneCall,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface Action {
  id: string
  icon: LucideIcon
  color: string
}

interface Scenario {
  actionCount: number
  icons: LucideIcon[]
  colors: string[]
  ids: string[]
}

const SCENARIO_CONFIGS: Scenario[] = [
  {
    actionCount: 4,
    icons: [Phone, Users, Handshake, CalendarClock],
    colors: ["#3D7A7A", "#0D4F4F", "#C9946E", "#0D4F4F"],
    ids: ["activity", "contact", "deal", "task"],
  },
  {
    actionCount: 1,
    icons: [PhoneCall],
    colors: ["#0D4F4F"],
    ids: ["phone"],
  },
  {
    actionCount: 3,
    icons: [CalendarClock, CalendarClock, CalendarClock],
    colors: ["#C9946E", "#3D7A7A", "#0D4F4F"],
    ids: ["task1", "task2", "task3"],
  },
  {
    actionCount: 1,
    icons: [StickyNote],
    colors: ["#3D7A7A"],
    ids: ["note"],
  },
  {
    actionCount: 2,
    icons: [ArrowRightCircle, ListChecks],
    colors: ["#C9946E", "#0D4F4F"],
    ids: ["deal-move", "activity-deal"],
  },
]

const SCENARIO_COUNT = SCENARIO_CONFIGS.length

export function AIDemo() {
  const t = useTranslations("marketing.aiDemo")
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-120px" })
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [typingDone, setTypingDone] = useState(false)
  const [processingVisible, setProcessingVisible] = useState(false)
  const [visibleActions, setVisibleActions] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)

  const config = SCENARIO_CONFIGS[scenarioIndex]
  const prompt = t(`scenarios.${scenarioIndex}.prompt`)
  const aiResponse = t(`scenarios.${scenarioIndex}.aiResponse`)
  const successText = t(`scenarios.${scenarioIndex}.successText`)

  const resetForNextScenario = useCallback(() => {
    setDisplayedText("")
    setTypingDone(false)
    setProcessingVisible(false)
    setVisibleActions(0)
    setScenarioIndex((prev) => (prev + 1) % SCENARIO_COUNT)
    setCycleKey((prev) => prev + 1)
  }, [])

  // Typing effect
  useEffect(() => {
    if (!isInView) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayedText(prompt.slice(0, i))
      if (i >= prompt.length) {
        clearInterval(timer)
        setTimeout(() => setTypingDone(true), 400)
      }
    }, 22)
    return () => clearInterval(timer)
  }, [isInView, cycleKey, prompt])

  // Processing indicator then reveal actions, then cycle
  useEffect(() => {
    if (!typingDone) return
    setProcessingVisible(true)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let idx = 0; idx < config.actionCount; idx++) {
      timers.push(
        setTimeout(() => {
          setVisibleActions((prev) => prev + 1)
        }, 800 + idx * 600)
      )
    }
    timers.push(
      setTimeout(() => {
        setProcessingVisible(false)
      }, 800 + config.actionCount * 600)
    )
    timers.push(
      setTimeout(() => {
        resetForNextScenario()
      }, 800 + config.actionCount * 600 + 3000)
    )
    return () => timers.forEach(clearTimeout)
  }, [typingDone, config.actionCount, resetForNextScenario])

  return (
    <section ref={ref} className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background depth */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[900px] rounded-full bg-teal opacity-[0.03] blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-warm opacity-[0.04] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        {/* The demo container — dark elevated card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-5xl"
        >
          {/* Outer glow */}
          <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-b from-primary/[0.06] via-transparent to-warm/[0.04] blur-xl" />

          {/* Main card */}
          <div
            className="relative rounded-[2rem] overflow-hidden border border-white/[0.06]"
            style={{
              background:
                "linear-gradient(170deg, #0F2626 0%, #0A1B1B 40%, #0D1717 100%)",
              boxShadow:
                "0 25px 80px -12px rgba(0,0,0,0.5), 0 4px 25px -5px rgba(13,79,79,0.15), inset 0 1px 0 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-6 py-4 border-b border-white/[0.05]">
              <div className="flex gap-2">
                <div className="h-3 w-3 rounded-full bg-[#EF4444]/60" />
                <div className="h-3 w-3 rounded-full bg-[#F59E0B]/60" />
                <div className="h-3 w-3 rounded-full bg-[#10B981]/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-4 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#3DD9D9]/70" />
                  <span className="text-xs font-medium text-white/50 tracking-wide">
                    {t("windowTitle")}
                  </span>
                </div>
              </div>
              {/* Scenario indicator dots */}
              <div className="flex gap-1.5 w-[52px] justify-end">
                {Array.from({ length: SCENARIO_COUNT }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-1.5 w-1.5 rounded-full transition-all duration-300"
                    style={{
                      background:
                        idx === scenarioIndex
                          ? "#3DD9D9"
                          : "rgba(255,255,255,0.15)",
                      boxShadow:
                        idx === scenarioIndex
                          ? "0 0 6px rgba(61,217,217,0.4)"
                          : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              {/* Chat area — fixed min-height prevents layout shift when scenarios cycle */}
              <div className="space-y-6 min-h-[700px] sm:min-h-[520px]" key={cycleKey}>
                {/* User message bubble */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex justify-end gap-3"
                >
                  <div className="max-w-lg">
                    <div
                      className="rounded-2xl rounded-tr-md px-5 py-4 text-sm leading-relaxed text-white/90"
                      style={{
                        background:
                          "linear-gradient(135deg, #0D4F4F, #0A3E3E)",
                        boxShadow:
                          "0 8px 30px -8px rgba(13,79,79,0.4), inset 0 1px 0 0 rgba(255,255,255,0.06)",
                      }}
                    >
                      {displayedText}
                      {!typingDone && (
                        <span className="inline-block w-0.5 h-4 bg-[#3DD9D9] ml-0.5 animate-pulse align-text-bottom" />
                      )}
                    </div>
                  </div>
                  {/* Avatar */}
                  <div
                    className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #C9946E, #A87A58)",
                      boxShadow: "0 4px 12px -3px rgba(201,148,110,0.4)",
                    }}
                  >
                    HF
                  </div>
                </motion.div>

                {/* AI response area */}
                <AnimatePresence>
                  {typingDone && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex gap-3"
                    >
                      {/* AI avatar */}
                      <div
                        className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center"
                        style={{
                          background: "rgba(61,217,217,0.1)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(61,217,217,0.15)",
                        }}
                      >
                        <span className="text-xs font-bold text-[#3DD9D9]">
                          Q
                        </span>
                      </div>

                      <div className="flex-1 space-y-4 max-w-2xl">
                        {/* Text response */}
                        <div
                          className="rounded-2xl rounded-tl-md px-5 py-4"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            boxShadow:
                              "inset 0 0 0 1px rgba(255,255,255,0.05), 0 4px 20px -5px rgba(0,0,0,0.2)",
                          }}
                        >
                          <p className="text-sm text-white/70 leading-relaxed">
                            {aiResponse}
                          </p>
                        </div>

                        {/* Processing indicator */}
                        <AnimatePresence>
                          {processingVisible &&
                            visibleActions < config.actionCount && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2 px-1"
                              >
                                <div className="flex gap-1">
                                  <div className="typing-dot h-1.5 w-1.5 rounded-full bg-[#3DD9D9]/60" />
                                  <div className="typing-dot h-1.5 w-1.5 rounded-full bg-[#3DD9D9]/60" />
                                  <div className="typing-dot h-1.5 w-1.5 rounded-full bg-[#3DD9D9]/60" />
                                </div>
                                <span className="text-xs text-white/30">
                                  {t("executingActions")}
                                </span>
                              </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action cards — staggered reveal */}
                        <div
                          className={`grid gap-3 ${
                            config.actionCount > 1
                              ? "sm:grid-cols-2"
                              : "sm:grid-cols-1 max-w-sm"
                          }`}
                        >
                          {Array.from({ length: config.actionCount }).map((_, idx) => {
                            const Icon = config.icons[idx]
                            const color = config.colors[idx]
                            const id = config.ids[idx]
                            const isVisible = idx < visibleActions
                            const label = t(`scenarios.${scenarioIndex}.actions.${idx}.label`)
                            const title = t(`scenarios.${scenarioIndex}.actions.${idx}.title`)
                            const detail = t(`scenarios.${scenarioIndex}.actions.${idx}.detail`)
                            const tag = t(`scenarios.${scenarioIndex}.actions.${idx}.tag`)
                            return (
                              <AnimatePresence key={id}>
                                {isVisible && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      y: 20,
                                      scale: 0.95,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                    }}
                                    transition={{
                                      duration: 0.5,
                                      ease: [0.16, 1, 0.3, 1],
                                    }}
                                    className="group relative overflow-hidden rounded-xl"
                                    style={{
                                      background: "rgba(255,255,255,0.03)",
                                      boxShadow: `inset 0 0 0 1px ${color}20, 0 8px 25px -8px rgba(0,0,0,0.3)`,
                                    }}
                                  >
                                    {/* Top accent bar */}
                                    <div
                                      className="h-0.5 w-full"
                                      style={{
                                        background: `linear-gradient(90deg, ${color}, ${color}40)`,
                                      }}
                                    />

                                    <div className="p-4">
                                      <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div
                                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                          style={{
                                            background: `${color}15`,
                                            boxShadow: `0 0 0 1px ${color}20`,
                                          }}
                                        >
                                          <Icon
                                            className="h-4 w-4"
                                            style={{
                                              color: color,
                                            }}
                                          />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          {/* Tag */}
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                              className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                              style={{
                                                color: color,
                                                background: `${color}12`,
                                              }}
                                            >
                                              {tag}
                                            </span>
                                            <CheckCircle2
                                              className="h-3 w-3"
                                              style={{
                                                color: color,
                                              }}
                                            />
                                          </div>

                                          <p className="text-sm font-medium text-white/85 leading-snug">
                                            {title}
                                          </p>
                                          <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                            <ChevronRight className="h-3 w-3" />
                                            {detail}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )
                          })}
                        </div>

                        {/* Success summary — appears after all actions */}
                        <AnimatePresence>
                          {visibleActions >= config.actionCount && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.3 }}
                              className="flex items-center gap-2 px-4 py-3 rounded-xl"
                              style={{
                                background: "rgba(61,217,217,0.06)",
                                boxShadow:
                                  "inset 0 0 0 1px rgba(61,217,217,0.1)",
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 text-[#3DD9D9]" />
                              <span className="text-sm text-[#3DD9D9]/80 font-medium">
                                {successText}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
