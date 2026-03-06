"use client"

import { useState, useRef, useEffect } from "react"
import { Variable } from "lucide-react"
import { VARIABLE_OPTIONS } from "./VariableNode"
import type { Editor } from "@tiptap/react"
import { cn } from "@/lib/utils"

interface VariableMenuProps {
  editor: Editor
}

export function VariableMenu({ editor }: VariableMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const insert = (variable: string) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "templateVariable", attrs: { variable } })
      .run()
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Insérer une variable"
        className={cn(
          "p-1.5 rounded-md hover:bg-accent transition-colors",
          open && "bg-accent text-accent-foreground"
        )}
      >
        <Variable className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg z-50 py-1">
          {VARIABLE_OPTIONS.map((group) => (
            <div key={group.group}>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {group.group}
              </div>
              {group.variables.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => insert(v.value)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                >
                  {v.label} <span className="text-muted-foreground text-xs ml-1">{`{{${v.value}}}`}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
