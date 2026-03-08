"use client"

import { useRef, useEffect, useCallback, KeyboardEvent } from "react"
import { useTranslations } from "next-intl"
import { SendHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const t = useTranslations("chat")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const value = useRef("")

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  const handleSubmit = useCallback(() => {
    const text = value.current.trim()
    if (!text || disabled) return
    onSend(text)
    value.current = ""
    if (textareaRef.current) {
      textareaRef.current.value = ""
      textareaRef.current.style.height = "auto"
    }
  }, [onSend, disabled])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="border-t border-border bg-background px-6 py-4">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-all duration-200 shadow-sm",
            "focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5"
          )}
        >
          <textarea
            ref={textareaRef}
            placeholder={t("inputPlaceholder")}
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-base sm:text-sm leading-6 placeholder:text-muted-foreground font-[family-name:var(--font-body)]",
              "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[200px] min-h-[24px]"
            )}
            onChange={(e) => {
              value.current = e.target.value
              resize()
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-200",
              "hover:bg-primary/90 hover:scale-105",
              disabled && "pointer-events-none opacity-40"
            )}
            disabled={disabled}
            onClick={handleSubmit}
            aria-label={t("sendLabel")}
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/50 font-[family-name:var(--font-body)]">
          {t("inputHint")}
        </p>
      </div>
    </div>
  )
}
