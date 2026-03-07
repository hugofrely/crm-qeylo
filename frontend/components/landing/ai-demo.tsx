"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
  label: string
  title: string
  detail: string
  color: string
  tag: string
}

interface Scenario {
  prompt: string
  aiResponse: string
  actions: Action[]
  successText: string
}

const SCENARIOS: Scenario[] = [
  {
    prompt:
      "J'ai contacte Marcel Deschamps par telephone ce matin, il aimerait faire un deal avec nous. On se voit demain a 15h30 en reunion dans leurs locaux.",
    aiResponse: "J'ai bien compris. Je m'occupe de tout :",
    actions: [
      {
        id: "activity",
        icon: Phone,
        label: "Activite enregistree",
        title: "Appel telephonique",
        detail: "Marcel Deschamps — ce matin",
        color: "#3D7A7A",
        tag: "Activite",
      },
      {
        id: "contact",
        icon: Users,
        label: "Contact mis a jour",
        title: "Marcel Deschamps",
        detail: "Dernier contact : aujourd'hui",
        color: "#0D4F4F",
        tag: "Contact",
      },
      {
        id: "deal",
        icon: Handshake,
        label: "Deal cree",
        title: "Nouveau deal — Marcel Deschamps",
        detail: "Pipeline : Prospection → Qualification",
        color: "#C9946E",
        tag: "Deal",
      },
      {
        id: "task",
        icon: CalendarClock,
        label: "Tache planifiee",
        title: "Reunion avec Marcel Deschamps",
        detail: "Demain a 15h30 — Locaux Marcel Deschamps",
        color: "#0D4F4F",
        tag: "Tache",
      },
    ],
    successText: "4 actions executees avec succes",
  },
  {
    prompt: "Ajoute le numero 06 12 34 56 78 au contact Sophie Martin.",
    aiResponse: "C'est fait !",
    actions: [
      {
        id: "phone",
        icon: PhoneCall,
        label: "Telephone ajoute",
        title: "Sophie Martin",
        detail: "06 12 34 56 78 — Mobile",
        color: "#0D4F4F",
        tag: "Contact",
      },
    ],
    successText: "Contact mis a jour",
  },
  {
    prompt: "Quelles sont mes taches pour aujourd'hui ?",
    aiResponse: "Voici vos 3 taches du jour :",
    actions: [
      {
        id: "task1",
        icon: CalendarClock,
        label: "09:30",
        title: "Appeler Fabien Moreau",
        detail: "Relance devis — Deal 8 500€",
        color: "#C9946E",
        tag: "Tache",
      },
      {
        id: "task2",
        icon: CalendarClock,
        label: "14:00",
        title: "Demo produit — Agence Pixel",
        detail: "Visio Google Meet",
        color: "#3D7A7A",
        tag: "Tache",
      },
      {
        id: "task3",
        icon: CalendarClock,
        label: "17:00",
        title: "Envoyer proposition commerciale",
        detail: "Claire Dubois — Studio Crea",
        color: "#0D4F4F",
        tag: "Tache",
      },
    ],
    successText: "3 taches trouvees pour aujourd'hui",
  },
  {
    prompt:
      "Ajoute une note sur le contact Pierre Leroy : il prefere etre contacte le matin avant 10h.",
    aiResponse: "Note ajoutee avec succes :",
    actions: [
      {
        id: "note",
        icon: StickyNote,
        label: "Note creee",
        title: "Pierre Leroy",
        detail: "Prefere etre contacte le matin avant 10h",
        color: "#3D7A7A",
        tag: "Note",
      },
    ],
    successText: "Note enregistree sur le contact",
  },
  {
    prompt:
      "Passe le deal 'Refonte site web' de Qualification a Proposition envoyee.",
    aiResponse: "Deal mis a jour :",
    actions: [
      {
        id: "deal-move",
        icon: ArrowRightCircle,
        label: "Etape modifiee",
        title: "Refonte site web",
        detail: "Qualification → Proposition envoyee",
        color: "#C9946E",
        tag: "Deal",
      },
      {
        id: "activity-deal",
        icon: ListChecks,
        label: "Activite enregistree",
        title: "Changement d'etape",
        detail: "Pipeline mis a jour automatiquement",
        color: "#0D4F4F",
        tag: "Activite",
      },
    ],
    successText: "Deal avance dans le pipeline",
  },
]

export function AIDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-120px" })
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [typingDone, setTypingDone] = useState(false)
  const [processingVisible, setProcessingVisible] = useState(false)
  const [visibleActions, setVisibleActions] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)

  const scenario = SCENARIOS[scenarioIndex]

  const resetForNextScenario = useCallback(() => {
    setDisplayedText("")
    setTypingDone(false)
    setProcessingVisible(false)
    setVisibleActions(0)
    setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length)
    setCycleKey((prev) => prev + 1)
  }, [])

  // Typing effect
  useEffect(() => {
    if (!isInView) return
    let i = 0
    const promptText = scenario.prompt
    const timer = setInterval(() => {
      i++
      setDisplayedText(promptText.slice(0, i))
      if (i >= promptText.length) {
        clearInterval(timer)
        setTimeout(() => setTypingDone(true), 400)
      }
    }, 22)
    return () => clearInterval(timer)
  }, [isInView, cycleKey, scenario.prompt])

  // Processing indicator then reveal actions, then cycle
  useEffect(() => {
    if (!typingDone) return
    setProcessingVisible(true)
    const timers: ReturnType<typeof setTimeout>[] = []
    const actions = scenario.actions
    actions.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setVisibleActions((prev) => prev + 1)
        }, 800 + idx * 600)
      )
    })
    timers.push(
      setTimeout(() => {
        setProcessingVisible(false)
      }, 800 + actions.length * 600)
    )
    // After all actions revealed + pause, cycle to next scenario
    timers.push(
      setTimeout(() => {
        resetForNextScenario()
      }, 800 + actions.length * 600 + 3000)
    )
    return () => timers.forEach(clearTimeout)
  }, [typingDone, scenario.actions, resetForNextScenario])

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
                    Qeylo Chat IA
                  </span>
                </div>
              </div>
              {/* Scenario indicator dots */}
              <div className="flex gap-1.5 w-[52px] justify-end">
                {SCENARIOS.map((_, idx) => (
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
              {/* Chat area */}
              <div className="space-y-6" key={cycleKey}>
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
                            {scenario.aiResponse}
                          </p>
                        </div>

                        {/* Processing indicator */}
                        <AnimatePresence>
                          {processingVisible &&
                            visibleActions < scenario.actions.length && (
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
                                  Execution des actions...
                                </span>
                              </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action cards — staggered reveal */}
                        <div
                          className={`grid gap-3 ${
                            scenario.actions.length > 1
                              ? "sm:grid-cols-2"
                              : "sm:grid-cols-1 max-w-sm"
                          }`}
                        >
                          {scenario.actions.map((action, idx) => {
                            const Icon = action.icon
                            const isVisible = idx < visibleActions
                            return (
                              <AnimatePresence key={action.id}>
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
                                      boxShadow: `inset 0 0 0 1px ${action.color}20, 0 8px 25px -8px rgba(0,0,0,0.3)`,
                                    }}
                                  >
                                    {/* Top accent bar */}
                                    <div
                                      className="h-0.5 w-full"
                                      style={{
                                        background: `linear-gradient(90deg, ${action.color}, ${action.color}40)`,
                                      }}
                                    />

                                    <div className="p-4">
                                      <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div
                                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                          style={{
                                            background: `${action.color}15`,
                                            boxShadow: `0 0 0 1px ${action.color}20`,
                                          }}
                                        >
                                          <Icon
                                            className="h-4 w-4"
                                            style={{
                                              color: action.color,
                                            }}
                                          />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          {/* Tag */}
                                          <div className="flex items-center gap-2 mb-1.5">
                                            <span
                                              className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                              style={{
                                                color: action.color,
                                                background: `${action.color}12`,
                                              }}
                                            >
                                              {action.tag}
                                            </span>
                                            <CheckCircle2
                                              className="h-3 w-3"
                                              style={{
                                                color: action.color,
                                              }}
                                            />
                                          </div>

                                          <p className="text-sm font-medium text-white/85 leading-snug">
                                            {action.title}
                                          </p>
                                          <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                            <ChevronRight className="h-3 w-3" />
                                            {action.detail}
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
                          {visibleActions >= scenario.actions.length && (
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
                                {scenario.successText}
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
