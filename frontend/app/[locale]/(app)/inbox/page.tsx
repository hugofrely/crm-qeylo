"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Mail, RefreshCw, Search, Inbox, Send, ArrowLeft, Paperclip, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  fetchInboxThreads,
  fetchThreadEmails,
  markEmailRead,
  triggerSync,
  fetchSyncStatus,
  fetchEmailAccounts,
} from "@/services/emails"
import { ComposeEmailDialog } from "@/components/emails/ComposeEmailDialog"
import { cn } from "@/lib/utils"
import { sanitizeHtml } from "@/lib/sanitize"
import type { EmailThread, Email, SyncStatus, EmailAccount } from "@/types/emails"
import { Link } from "@/i18n/navigation"
import { useTranslations, useLocale } from "next-intl"

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function InboxPage() {
  const t = useTranslations("notifications.inbox")
  const locale = useLocale()
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [composeOpen, setComposeOpen] = useState(false)
  const [mobileShowEmail, setMobileShowEmail] = useState(false)

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null

  const loadThreads = useCallback(async () => {
    try {
      const params: { search?: string; unread?: boolean } = {}
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (filter === "unread") params.unread = true
      const data = await fetchInboxThreads(params)
      setThreads(data.results)
    } catch {
      // silently fail
    } finally {
      setLoadingThreads(false)
    }
  }, [searchQuery, filter])

  // Initial load and auto-refresh
  useEffect(() => {
    loadThreads()
    fetchSyncStatus().then(setSyncStatus).catch(() => {})
    const interval = setInterval(loadThreads, 30000)
    return () => clearInterval(interval)
  }, [loadThreads])

  // Load emails when thread is selected
  const handleSelectThread = useCallback(async (threadId: string) => {
    setSelectedThreadId(threadId)
    setMobileShowEmail(true)
    setLoadingEmails(true)
    try {
      const threadEmails = await fetchThreadEmails(threadId)
      setEmails(threadEmails)
      // Mark unread emails as read
      const unreadEmails = threadEmails.filter((e) => !e.is_read)
      for (const email of unreadEmails) {
        await markEmailRead(email.id, true)
      }
      if (unreadEmails.length > 0) {
        // Update thread unread count locally
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        )
      }
    } catch {
      // silently fail
    } finally {
      setLoadingEmails(false)
    }
  }, [])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await triggerSync()
      // Wait for sync to complete then refresh
      setTimeout(async () => {
        await loadThreads()
        const status = await fetchSyncStatus()
        setSyncStatus(status)
        setSyncing(false)
      }, 3000)
    } catch {
      setSyncing(false)
    }
  }, [loadThreads])

  // Find contact info from selected thread emails
  const contactFromThread = emails.find((e) => e.contact)
  const contactId = contactFromThread?.contact ?? null
  const contactName = contactFromThread?.contact_name ?? null
  const contactEmail = emails.find((e) => e.direction === "inbound")?.from_address ?? ""

  return (
    <div className="flex h-full bg-background font-[family-name:var(--font-body)]">
      {/* Left column - Thread list */}
      <div
        className={cn(
          "w-[300px] shrink-0 border-r border-border flex flex-col",
          mobileShowEmail ? "hidden md:flex" : "flex w-full md:w-[300px]"
        )}
      >
        {/* Search & filters */}
        <div className="p-3 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter("all")}
            >
              {t("all")}
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter("unread")}
            >
              {t("unread")}
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleSync}
              disabled={syncing}
              title={t("sync")}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
              />
            </Button>
          </div>
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          {loadingThreads ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              {t("loading")}
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">{t("noEmails")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={cn(
                    "w-full text-left px-3 py-3 hover:bg-muted transition-colors",
                    selectedThreadId === thread.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {thread.unread_count > 0 && (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm truncate",
                            thread.unread_count > 0
                              ? "font-semibold"
                              : "font-medium"
                          )}
                        >
                          {thread.last_email?.from_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {thread.last_email?.sent_at
                            ? formatRelativeTime(thread.last_email.sent_at)
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm truncate text-foreground/80">
                          {thread.subject}
                        </p>
                        {thread.message_count > 1 && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px] px-1.5 py-0 h-4"
                          >
                            {thread.message_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {thread.last_email?.snippet || ""}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Middle column - Email view */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          mobileShowEmail ? "flex" : "hidden md:flex"
        )}
      >
        {!selectedThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{t("selectConversation")}</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 md:hidden"
                onClick={() => setMobileShowEmail(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate">
                  {selectedThread.subject}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedThread.message_count} message{selectedThread.message_count > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Email list */}
            <ScrollArea className="flex-1">
              {loadingEmails ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  {t("loading")}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                          {email.from_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {email.from_name || email.from_address}
                            </span>
                            {email.direction === "outbound" ? (
                              <Send className="h-3 w-3 text-blue-500 shrink-0" />
                            ) : (
                              <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            {email.has_attachments && (
                              <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(email.sent_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div
                        className="text-sm prose prose-sm max-w-none [&_img]:max-w-full [&_a]:text-primary"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body_html) }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Reply button */}
            <div className="p-3 border-t border-border">
              <Button
                className="w-full"
                onClick={() => setComposeOpen(true)}
                disabled={!contactId}
              >
                <Send className="h-4 w-4 mr-2" />
                {t("reply")}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Right column - Contact info */}
      <div className="hidden lg:flex w-[280px] shrink-0 border-l border-border flex-col">
        {selectedThread && contactId ? (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">{t("contact")}</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {contactName || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {contactEmail}
                </p>
              </div>
            </div>
            <Link
              href={`/contacts/${contactId}`}
              className="block text-sm text-primary hover:underline"
            >
              {t("viewContact")}
            </Link>
          </div>
        ) : selectedThread ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-xs">{t("noContact")}</p>
          </div>
        ) : null}
      </div>

      {/* Compose dialog */}
      {contactId && (
        <ComposeEmailDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          contactId={contactId}
          contactEmail={contactEmail}
          contactName={contactName || ""}
          onSent={() => {
            if (selectedThreadId) {
              handleSelectThread(selectedThreadId)
            }
          }}
        />
      )}
    </div>
  )
}
