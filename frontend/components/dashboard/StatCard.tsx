"use client"

import { type LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  description?: string
}

export function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      {/* Subtle accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
            {title}
          </p>
          <p className="text-3xl font-light tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">{description}</p>
          )}
        </div>
        <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
