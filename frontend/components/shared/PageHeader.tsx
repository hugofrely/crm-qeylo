"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4", className)}>
      <div>
        <h1 className="text-3xl tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1 font-[family-name:var(--font-body)]">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
