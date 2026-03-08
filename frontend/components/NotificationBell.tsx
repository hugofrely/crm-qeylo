"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Notification } from "@/types"
import { useNotifications } from "@/hooks/useNotifications"
import { useTranslations, useLocale } from "next-intl"

function useFormatRelativeTime() {
  const t = useTranslations("notifications.relativeTime")
  const locale = useLocale()

  return (dateStr: string): string => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return t("justNow")
    if (diffMin < 60) return t("minutesAgo", { minutes: diffMin })
    if (diffHour < 24) return t("hoursAgo", { hours: diffHour })
    if (diffDay === 1) return t("yesterday")
    if (diffDay < 7) return t("daysAgo", { days: diffDay })
    return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")
  }
}

export function NotificationBell() {
  const router = useRouter()
  const t = useTranslations("notifications")
  const { notifications, unreadCount, loading, loadNotifications, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const formatRelativeTime = useFormatRelativeTime()

  const handleToggle = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen) {
      loadNotifications()
    }
  }

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markRead(notification.id)
      } catch {
        // ignore
      }
    }

    setOpen(false)

    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllRead()
    } catch {
      // ignore
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label={t("ariaLabel")}
        className="relative rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-fade-in-up font-[family-name:var(--font-body)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium" style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
              {t("title")}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="text-xs text-muted-foreground">
                  {t("loading")}
                </span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Bell className="h-5 w-5 text-muted-foreground/30 mb-2" />
                <span className="text-xs text-muted-foreground">
                  {t("empty")}
                </span>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 border-b border-border/50 last:border-0",
                    !notification.is_read && "bg-primary/4"
                  )}
                >
                  <div className="mt-1.5 shrink-0">
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        notification.is_read
                          ? "bg-transparent"
                          : "bg-primary"
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/50">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
