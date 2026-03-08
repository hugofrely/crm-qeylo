"use client"

import { useState, useRef, useEffect } from "react"
import { Plus, X, Users, Kanban, CheckSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function QuickCreateFAB() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const t = useTranslations("notifications.quickCreate")

  const actions = [
    { label: t("contact"), icon: Users, href: "/contacts", param: "create-contact" },
    { label: t("deal"), icon: Kanban, href: "/deals", param: "create-deal" },
    { label: t("task"), icon: CheckSquare, href: "/tasks", param: "create-task" },
  ]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={wrapperRef} className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-2">
      {open && actions.map((action, i) => (
        <a
          key={action.param}
          href={`${action.href}?action=${action.param}`}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-2 rounded-full bg-card border border-border shadow-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
            "hover:bg-secondary hover:shadow-xl",
            "animate-in fade-in slide-in-from-bottom-2"
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <action.icon className="h-4 w-4 text-primary" />
          {action.label}
        </a>
      ))}

      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200",
          "hover:shadow-xl hover:scale-105 active:scale-95",
          open && "rotate-45"
        )}
        aria-label={t("ariaLabel")}
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  )
}
