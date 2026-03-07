"use client"

import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

export function ListCard({ action }: { action: EnrichedAction }) {
  const results = action.results || []
  const VISIBLE_COUNT = 3

  const expandable = results.length > VISIBLE_COUNT ? (
    <div className="space-y-1">
      {results.slice(VISIBLE_COUNT).map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium truncate">{String(r.name || r.description || r.content || "")}</span>
          {r.is_active !== undefined && (
            <span className={r.is_active ? "text-green-600" : "text-muted-foreground"}>
              {r.is_active ? "Actif" : "Inactif"}
            </span>
          )}
        </div>
      ))}
    </div>
  ) : undefined

  return (
    <CardShell action={action} expandableContent={expandable}>
      {results.length > 0 ? (
        <div className="space-y-1">
          {results.slice(0, VISIBLE_COUNT).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="font-medium truncate">{String(r.name || r.description || r.content || "")}</span>
              {r.is_active !== undefined && (
                <span className={r.is_active ? "text-green-600" : "text-muted-foreground"}>
                  {r.is_active ? "Actif" : "Inactif"}
                </span>
              )}
            </div>
          ))}
          {results.length > VISIBLE_COUNT && (
            <p className="text-[11px] text-muted-foreground">+ {results.length - VISIBLE_COUNT} autres</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun résultat</p>
      )}
    </CardShell>
  )
}
