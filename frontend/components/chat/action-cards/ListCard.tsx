"use client"

import { CardShell } from "./CardShell"
import type { EnrichedAction } from "@/types/chat"

export function ListCard({ action }: { action: EnrichedAction }) {
  const results = action.results || []
  return (
    <CardShell action={action}>
      {results.length > 0 ? (
        <div className="space-y-1">
          {results.slice(0, 8).map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="font-medium truncate">{String(r.name || r.description || r.content || "")}</span>
              {r.is_active !== undefined && (
                <span className={r.is_active ? "text-green-600" : "text-muted-foreground"}>
                  {r.is_active ? "Actif" : "Inactif"}
                </span>
              )}
            </div>
          ))}
          {results.length > 8 && (
            <p className="text-[11px] text-muted-foreground">+ {results.length - 8} autres</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun resultat</p>
      )}
    </CardShell>
  )
}
