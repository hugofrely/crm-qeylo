"use client"

import { useRef, useEffect, useCallback, KeyboardEvent } from "react"
import { SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
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

  // Re-focus after AI finishes responding
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
    <div className="border-t border-border bg-background px-4 py-3">
      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2 transition-colors",
          "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
        )}
      >
        <textarea
          ref={textareaRef}
          placeholder="Décris ce que tu veux faire..."
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm leading-6 placeholder:text-muted-foreground",
            "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-[200px] min-h-[24px]"
          )}
          onChange={(e) => {
            value.current = e.target.value
            resize()
          }}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-colors",
            "hover:bg-primary hover:text-primary-foreground",
            disabled && "pointer-events-none opacity-50"
          )}
          disabled={disabled}
          onClick={handleSubmit}
          aria-label="Envoyer le message"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
        Entrée pour envoyer &middot; Maj+Entrée pour un retour à la ligne
      </p>
    </div>
  )
}
