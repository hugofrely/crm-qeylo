"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Building2, ChevronRight, ChevronDown, GitBranch } from "lucide-react"
import { fetchCompanyHierarchy } from "@/services/companies"
import type { CompanyHierarchyNode } from "@/types"

export interface CompanyHierarchyProps {
  companyId: string
}

function HierarchyNode({
  node,
  currentId,
  depth = 0,
}: {
  node: CompanyHierarchyNode
  currentId: string
  depth?: number
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isCurrent = node.id === currentId

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
          isCurrent
            ? "bg-primary/10 text-primary"
            : "hover:bg-secondary/50"
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => {
          if (!isCurrent) {
            router.push(`/companies/${node.id}`)
          }
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="shrink-0 p-0.5 rounded hover:bg-secondary transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-[18px]" />
        )}
        <Building2 className={`h-4 w-4 shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
        <span className={`text-sm font-[family-name:var(--font-body)] truncate ${isCurrent ? "font-semibold" : ""}`}>
          {node.name}
        </span>
        {node.industry && (
          <span className="text-[11px] text-muted-foreground font-[family-name:var(--font-body)] ml-auto shrink-0">
            {node.industry}
          </span>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-border/50"
            style={{ marginLeft: `${depth * 20 + 22}px` }}
          />
          {node.children.map((child) => (
            <HierarchyNode
              key={child.id}
              node={child}
              currentId={currentId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CompanyHierarchy({ companyId }: CompanyHierarchyProps) {
  const [hierarchy, setHierarchy] = useState<CompanyHierarchyNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchCompanyHierarchy(companyId)
      .then((data) => setHierarchy(data as CompanyHierarchyNode))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hierarchy) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <GitBranch className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-muted-foreground text-sm font-[family-name:var(--font-body)]">
          Aucune hierarchie disponible.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <HierarchyNode node={hierarchy} currentId={companyId} />
    </div>
  )
}
