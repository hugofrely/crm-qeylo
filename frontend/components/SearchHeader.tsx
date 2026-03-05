"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, Kanban, CheckSquare, X } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { useSearch } from "@/hooks/useSearch"

export function SearchHeader() {
  const router = useRouter()
  const { query, results, loading, open, setOpen, search, close } = useSearch()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, setOpen])

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [setOpen])

  const navigate = (path: string) => {
    close()
    router.push(path)
  }

  const hasResults = results &&
    (results.contacts.length > 0 || results.deals.length > 0 || results.tasks.length > 0)
  const noResults = results && !hasResults && query.trim().length >= 2

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-6 py-3">
        {/* Search input */}
        <div ref={containerRef} className="relative flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => search(e.target.value)}
              onFocus={() => {
                if (results && query.trim().length >= 2) setOpen(true)
              }}
              placeholder="Rechercher contacts, deals, taches..."
              className="w-full rounded-lg border border-border bg-secondary/30 py-2 pl-10 pr-10 text-sm font-[family-name:var(--font-body)] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
            {query && (
              <button
                onClick={close}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {!query && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40 font-[family-name:var(--font-body)]">
                <kbd className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px]">&#8984;</kbd>
                <kbd className="rounded border border-border bg-secondary px-1 py-0.5 text-[10px]">K</kbd>
              </span>
            )}
          </div>

          {/* Results dropdown */}
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-fade-in-up z-50">
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <span className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                    Recherche...
                  </span>
                </div>
              )}

              {!loading && noResults && (
                <div className="flex items-center justify-center py-6">
                  <span className="text-xs text-muted-foreground font-[family-name:var(--font-body)]">
                    Aucun résultat pour &quot;{query.trim()}&quot;
                  </span>
                </div>
              )}

              {!loading && hasResults && (
                <div className="max-h-80 overflow-y-auto">
                  {/* Contacts */}
                  {results.contacts.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)]">
                        Contacts
                      </div>
                      {results.contacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/contacts/${c.id}`)}
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate font-[family-name:var(--font-body)]">
                              {c.first_name} {c.last_name}
                            </p>
                            {c.company && (
                              <p className="text-[11px] text-muted-foreground truncate font-[family-name:var(--font-body)]">
                                {c.company}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Deals */}
                  {results.deals.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] border-t border-border/50">
                        Pipeline
                      </div>
                      {results.deals.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => navigate("/deals")}
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                          <Kanban className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate font-[family-name:var(--font-body)]">
                              {d.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate font-[family-name:var(--font-body)]">
                              {d.stage_name}{d.contact_name ? ` · ${d.contact_name}` : ""}
                              {Number(d.amount) > 0 ? ` · ${Number(d.amount).toLocaleString("fr-FR")} €` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tasks */}
                  {results.tasks.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground font-[family-name:var(--font-body)] border-t border-border/50">
                        Taches
                      </div>
                      {results.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => navigate("/tasks")}
                          className="flex w-full items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors"
                        >
                          <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium truncate font-[family-name:var(--font-body)]">
                              {t.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate font-[family-name:var(--font-body)]">
                              {t.priority === "high" ? "Haute" : t.priority === "low" ? "Basse" : "Normale"}
                              {t.contact_name ? ` · ${t.contact_name}` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <NotificationBell />
      </div>
    </div>
  )
}
