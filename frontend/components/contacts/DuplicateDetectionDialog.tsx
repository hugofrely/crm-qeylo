"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { ArrowLeft, AlertTriangle, GitMerge } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DuplicateMatch } from "@/types"

interface DuplicateDetectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicates: DuplicateMatch[]
  newContactData: Record<string, unknown>
  onCreateAnyway: () => void
  onMerge: (primaryId: string, fieldOverrides: Record<string, unknown>) => void
  onCancel: () => void
}

const MERGE_FIELD_KEYS = [
  "first_name", "last_name", "email", "secondary_email", "phone",
  "mobile_phone", "secondary_phone", "company", "job_title", "industry",
  "siret", "address", "city", "postal_code", "country", "state",
  "linkedin_url", "twitter_url", "website", "lead_score", "decision_role",
  "preferred_channel", "notes", "source",
]

export function DuplicateDetectionDialog({
  open,
  onOpenChange,
  duplicates,
  newContactData,
  onCreateAnyway,
  onMerge,
  onCancel,
}: DuplicateDetectionDialogProps) {
  const t = useTranslations("contacts")

  const MERGE_FIELDS: { key: string; label: string }[] = MERGE_FIELD_KEYS.map((key) => ({
    key,
    label: t(`duplicates.fields.${
      key === "first_name" ? "firstName" :
      key === "last_name" ? "lastName" :
      key === "secondary_email" ? "secondaryEmail" :
      key === "mobile_phone" ? "mobile" :
      key === "secondary_phone" ? "secondaryPhone" :
      key === "job_title" ? "jobTitle" :
      key === "postal_code" ? "postalCode" :
      key === "linkedin_url" ? "linkedin" :
      key === "twitter_url" ? "twitter" :
      key === "lead_score" ? "leadScore" :
      key === "decision_role" ? "decisionRole" :
      key === "preferred_channel" ? "preferredChannel" :
      key === "state" ? "region" :
      key
    }`),
  }))

  const [view, setView] = useState<"list" | "merge">("list")
  const [selectedDuplicate, setSelectedDuplicate] =
    useState<DuplicateMatch | null>(null)

  const differingFields = useMemo(() => {
    if (!selectedDuplicate) return []
    const existing = selectedDuplicate.contact as unknown as Record<string, unknown>
    return MERGE_FIELDS.filter(({ key }) => {
      const existingVal = existing[key]
      const newVal = newContactData[key]
      const hasExisting = existingVal !== null && existingVal !== undefined && existingVal !== ""
      const hasNew = newVal !== null && newVal !== undefined && newVal !== ""
      if (!hasExisting && !hasNew) return false
      return existingVal !== newVal
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDuplicate, newContactData])

  const [selectedValues, setSelectedValues] = useState<
    Record<string, "existing" | "new">
  >({})

  const initializeSelectedValues = (duplicate: DuplicateMatch) => {
    const existing = duplicate.contact as unknown as Record<string, unknown>
    const initial: Record<string, "existing" | "new"> = {}
    MERGE_FIELDS.forEach(({ key }) => {
      const existingVal = existing[key]
      const newVal = newContactData[key]
      const hasExisting = existingVal !== null && existingVal !== undefined && existingVal !== ""
      const hasNew = newVal !== null && newVal !== undefined && newVal !== ""
      if (hasExisting) {
        initial[key] = "existing"
      } else if (hasNew) {
        initial[key] = "new"
      } else {
        initial[key] = "existing"
      }
    })
    setSelectedValues(initial)
  }

  const handleSelectDuplicate = (duplicate: DuplicateMatch) => {
    setSelectedDuplicate(duplicate)
    initializeSelectedValues(duplicate)
    setView("merge")
  }

  const handleBackToList = () => {
    setView("list")
    setSelectedDuplicate(null)
  }

  const handleMerge = () => {
    if (!selectedDuplicate) return
    const fieldOverrides: Record<string, unknown> = {}
    differingFields.forEach(({ key }) => {
      if (selectedValues[key] === "new") {
        fieldOverrides[key] = newContactData[key]
      }
    })
    onMerge(selectedDuplicate.contact.id, fieldOverrides)
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "\u2014"
    return String(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          view === "list"
            ? "max-w-2xl font-[family-name:var(--font-body)]"
            : "max-w-4xl font-[family-name:var(--font-body)]"
        }
      >
        <DialogHeader>
          {view === "merge" && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 w-fit gap-1.5"
              onClick={handleBackToList}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("duplicates.back")}
            </Button>
          )}
          <DialogTitle className="flex items-center gap-2">
            {view === "list" ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {t("duplicates.title")}
              </>
            ) : (
              <>
                <GitMerge className="h-5 w-5" />
                {t("duplicates.mergeTitle")}
              </>
            )}
          </DialogTitle>
          {view === "list" && (
            <p className="text-sm text-muted-foreground">
              {t("duplicates.description", { count: duplicates.length })}
            </p>
          )}
        </DialogHeader>

        {view === "list" && (
          <div className="space-y-3">
            {duplicates.map((duplicate) => {
              const contact = duplicate.contact
              return (
                <div
                  key={contact.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </span>
                        {duplicate.score >= 0.8 ? (
                          <Badge variant="destructive">{t("duplicates.veryLikely")}</Badge>
                        ) : duplicate.score >= 0.5 ? (
                          <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                            {t("duplicates.possible")}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {contact.email && (
                          <span
                            className={
                              duplicate.matched_on?.includes("email")
                                ? "rounded bg-yellow-500/10 px-1"
                                : ""
                            }
                          >
                            {contact.email}
                          </span>
                        )}
                        {contact.company && (
                          <span
                            className={
                              duplicate.matched_on?.includes("company")
                                ? "rounded bg-yellow-500/10 px-1"
                                : ""
                            }
                          >
                            {contact.company}
                          </span>
                        )}
                        {contact.phone && (
                          <span
                            className={
                              duplicate.matched_on?.includes("phone")
                                ? "rounded bg-yellow-500/10 px-1"
                                : ""
                            }
                          >
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSelectDuplicate(duplicate)}
                    >
                      <GitMerge className="mr-1.5 h-3.5 w-3.5" />
                      {t("duplicates.merge")}
                    </Button>
                  </div>
                </div>
              )
            })}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onCancel}>
                {t("duplicates.cancel")}
              </Button>
              <Button variant="outline" onClick={onCreateAnyway}>
                {t("duplicates.createAnyway")}
              </Button>
            </div>
          </div>
        )}

        {view === "merge" && selectedDuplicate && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-border/60 bg-secondary/30 px-4 py-2.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("import.mergeTableHeaders.field")}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("import.mergeTableHeaders.existingContact")}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("import.mergeTableHeaders.newContact")}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {differingFields.map(({ key, label }) => {
                  const existingVal = (
                    selectedDuplicate.contact as unknown as Record<string, unknown>
                  )[key]
                  const newVal = newContactData[key]
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_1fr_1fr] items-center px-4 py-2.5"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`merge-${key}`}
                          checked={selectedValues[key] === "existing"}
                          onChange={() =>
                            setSelectedValues((prev) => ({
                              ...prev,
                              [key]: "existing",
                            }))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-muted-foreground">
                          {formatValue(existingVal)}
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`merge-${key}`}
                          checked={selectedValues[key] === "new"}
                          onChange={() =>
                            setSelectedValues((prev) => ({
                              ...prev,
                              [key]: "new",
                            }))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-muted-foreground">
                          {formatValue(newVal)}
                        </span>
                      </label>
                    </div>
                  )
                })}
                {differingFields.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t("emptyState.noDifference")}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleBackToList}>
                {t("duplicates.back")}
              </Button>
              <Button onClick={handleMerge}>
                <GitMerge className="mr-1.5 h-4 w-4" />
                {t("duplicates.merge")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
